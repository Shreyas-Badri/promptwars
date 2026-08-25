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

@app.on_event("startup")
async def startup():
    pass

@app.post("/api/upload")
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    # 1. Validate file extension/size
    allowed_extensions = {".pdf", ".md", ".zip"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        return {"error": "Invalid file type"}

    # 2. Upload file via Storage Service
    from services import SupabaseStorage
    storage = SupabaseStorage()
    file_bytes = await file.read()
    file_path = f"{uuid.uuid4()}_{file.filename}"
    public_url = await storage.upload(file_path, file_bytes)
        
    # 3. Create Document record
    new_doc = Document(
        filename=file.filename,
        file_type=ext,
        file_path=public_url, # Now storing the remote URL
        status="UPLOADED"
    )
    db.add(new_doc)
    await db.commit()
    await db.refresh(new_doc)
    
    # 4. Enqueue background task for extraction
    background_tasks.add_task(process_document, new_doc.id, public_url)
    
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
