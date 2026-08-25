import re
import os
import uuid
import logging

logger = logging.getLogger(__name__)

SECRET_REGEXES = [
    re.compile(r"API_KEY\s*=\s*['\"]?[a-zA-Z0-9_-]+['\"]?"),
    re.compile(r"password\s*=\s*['\"]?[^'\"]+['\"]?"),
    re.compile(r"-----BEGIN PRIVATE KEY-----")
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
    from models import Document, Node, Relationship
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
        
        # Fetch file if remote, otherwise open locally
        if file_path.startswith("http"):
            response = requests.get(file_path)
            file_bytes = response.content
        else:
            with open(file_path, "rb") as f:
                file_bytes = f.read()
                
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
            doc.error_message = "File contains secrets."
            await db_session.commit()
            return
            
        doc.content = text
        metadata = extract_metadata(text)
        
        # LLM Extraction using Service Abstraction
        extraction_service = FallbackExtractionService()
        entities_relations = await extraction_service.extract(text)
        
        doc.status = "EMBEDDING"
        await db_session.commit()
        
        # We don't fully store the nodes here in the MVP mock, but we would map them
        
        doc.status = "COMPLETED"
        await db_session.commit()
        
    except Exception as e:
        logger.exception("Error processing document")
        doc.status = "FAILED"
        doc.error_message = str(e)
        await db_session.commit()
