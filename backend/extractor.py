import re
import os
import uuid
import logging
from sqlalchemy import select

logger = logging.getLogger(__name__)

# Specific secret detection patterns (only match actual credentials, not documentation text)
SECRET_REGEXES = [
    re.compile(r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"AIzaSy[0-9A-Za-z-_]{33}"),
    re.compile(r"sk-[a-zA-Z0-9]{32,}"),
    re.compile(r"gsk_[a-zA-Z0-9]{32,}"),
    re.compile(r"ghp_[a-zA-Z0-9]{36}")
]

def contains_secrets(text: str) -> bool:
    for r in SECRET_REGEXES:
        if r.search(text):
            return True
    return False

def extract_metadata(text: str):
    dois = re.findall(r"\b(10\.\d{4,9}/[-._;()/:A-Z0-9]+)\b", text, re.I)
    emails = re.findall(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", text)
    urls = re.findall(r"https?://[^\s]+", text)
    github_links = [u for u in urls if "github.com" in u]
    
    return {
        "dois": list(set(dois)),
        "emails": list(set(emails)),
        "urls": list(set(urls)),
        "github_links": list(set(github_links))
    }

async def process_document_pipeline(document_id: str, file_path: str, db_session):
    from models import Document, Node, Relationship, Embedding
    from services import FallbackExtractionService, FallbackEmbeddingService
    
    doc = await db_session.get(Document, uuid.UUID(document_id))
    if not doc:
        return
        
    doc.status = "EXTRACTING"
    await db_session.commit()
    
    try:
        text = ""
        import io
        import requests
        
        file_bytes = b""
        if os.path.exists(file_path):
            with open(file_path, "rb") as f:
                file_bytes = f.read()
        elif file_path.startswith("http"):
            try:
                resp = requests.get(file_path, timeout=10)
                if resp.status_code == 200:
                    file_bytes = resp.content
            except Exception as ex:
                logger.warning(f"Remote file download error: {ex}")
                
        if file_path.endswith(".pdf"):
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                if page.extract_text():
                    text += page.extract_text() + "\n"
        else:
            text = file_bytes.decode("utf-8", errors="ignore")

        if contains_secrets(text):
            doc.status = "FAILED"
            doc.error_message = "File contains sensitive credentials or private keys."
            await db_session.commit()
            return
            
        doc.content = text
        metadata = extract_metadata(text)
        
        # LLM Entity & Relation Extraction using Service Abstraction
        extraction_service = FallbackExtractionService()
        extracted_data = await extraction_service.extract(text)
        
        doc.status = "EMBEDDING"
        await db_session.commit()
        
        embedding_service = FallbackEmbeddingService()
        
        # Store Extracted Nodes
        nodes_map = {}
        for n in extracted_data.get("nodes", []):
            name = n.get("name", "").strip()
            ntype = n.get("type", "TOPIC").upper()
            if not name:
                continue
                
            stmt = select(Node).where(Node.name == name, Node.type == ntype)
            result = await db_session.execute(stmt)
            existing_node = result.scalar_one_or_none()
            
            if not existing_node:
                new_node = Node(name=name, type=ntype)
                db_session.add(new_node)
                await db_session.flush()
                nodes_map[n.get("id", name)] = new_node.id
                
                try:
                    embed_vecs = await embedding_service.generate([name])
                    if embed_vecs and len(embed_vecs) > 0:
                        db_session.add(Embedding(node_id=new_node.id, embedding=embed_vecs[0]))
                except Exception as embed_err:
                    logger.warning(f"Vector embedding generation failed for {name}: {embed_err}")
            else:
                nodes_map[n.get("id", name)] = existing_node.id

        # Store Extracted Relationships
        for r in extracted_data.get("relationships", []):
            src_ref = r.get("source_id")
            tgt_ref = r.get("target_id")
            rtype = r.get("type", "CONNECTED_TO")
            
            src_uuid = nodes_map.get(src_ref)
            tgt_uuid = nodes_map.get(tgt_ref)
            
            if src_uuid and tgt_uuid and src_uuid != tgt_uuid:
                rel = Relationship(
                    source_node_id=src_uuid,
                    target_node_id=tgt_uuid,
                    type=rtype,
                    source_document_id=doc.id,
                    page_section="Extracted Content",
                    confidence=0.92,
                    extraction_method="Gemini/Groq Fallback"
                )
                db_session.add(rel)

        doc.status = "COMPLETED"
        await db_session.commit()
        
    except Exception as e:
        logger.exception("Error processing document pipeline")
        doc.status = "FAILED"
        doc.error_message = str(e)
        await db_session.commit()
