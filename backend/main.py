from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db, engine, Base
from models import Document
from fastapi.middleware.cors import CORSMiddleware
import uuid
import os

app = FastAPI(title="Graphis MVP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    try:
        async with engine.begin() as conn:
            try:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            except Exception as ex:
                logger.warning(f"Vector extension creation skipped: {ex}")
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables initialized successfully on startup.")
    except Exception as e:
        logger.error(f"Startup DB init error: {e}")

@app.post("/api/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    allowed_extensions = {".pdf", ".md", ".zip", ".txt"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        return {"error": "Invalid file type. Supported: .pdf, .md, .zip, .txt"}

    # Save to local storage for worker access
    local_dir = "/tmp/uploads" if os.path.exists("/tmp") else "uploads"
    os.makedirs(local_dir, exist_ok=True)
    file_id = str(uuid.uuid4())
    local_filename = f"{file_id}_{file.filename}"
    local_file_path = os.path.join(local_dir, local_filename)

    file_bytes = await file.read()
    with open(local_file_path, "wb") as f:
        f.write(file_bytes)

    # Optional remote storage upload
    from services import SupabaseStorage
    storage = SupabaseStorage()
    remote_url = await storage.upload(local_filename, file_bytes)
        
    new_doc = Document(
        filename=file.filename,
        file_type=ext,
        file_path=remote_url or local_file_path,
        status="UPLOADED"
    )
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)
    
    # Process document in background using local cached file
    background_tasks.add_task(process_document, new_doc.id, local_file_path)
    
    return {"message": "File uploaded successfully", "document_id": str(new_doc.id)}

@app.get("/api/status/{document_id}")
async def get_status(document_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, uuid.UUID(document_id))
    if not doc:
        return {"error": "Document not found"}
    return {"status": doc.status, "error_message": doc.error_message}

async def process_document(document_id: uuid.UUID, file_path: str):
    from extractor import process_document_pipeline
    from database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        await process_document_pipeline(str(document_id), file_path, session)

@app.get("/api/search")
async def search(query: str, limit: int = 10, db: AsyncSession = Depends(get_db)):
    from search import semantic_search
    results = await semantic_search(query, db, limit)
    return {"results": [{"id": str(r["node"].id), "name": r["node"].name, "type": r["node"].type, "distance": r["distance"]} for r in results]}

@app.get("/api/graph/{node_id}")
async def get_graph(node_id: str, hops: int = 2, db: AsyncSession = Depends(get_db)):
    from graph import get_graph_neighborhood
    data = await get_graph_neighborhood(node_id, hops, db)
    if not data:
        return {"error": "Node not found"}
    return {
        "nodes": [{"id": str(n.id), "name": n.name, "type": n.type} for n in data["nodes"]],
        "edges": [{"source": str(e.source_node_id), "target": str(e.target_node_id), "label": e.type} for e in data["edges"]]
    }

@app.get("/api/overlap/{node1_id}/{node2_id}")
async def get_overlap(node1_id: str, node2_id: str, db: AsyncSession = Depends(get_db)):
    from graph import calculate_overlap
    data = await calculate_overlap(node1_id, node2_id, db)
    return data
