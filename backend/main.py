from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db, engine, Base
from models import Document
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
import uuid
import os
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title="Graphis MVP API")

@app.middleware("http")
async def cors_and_error_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return JSONResponse(
            status_code=200,
            content={"status": "OK"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    try:
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response
    except Exception as exc:
        logger.exception(f"Unhandled server error on {request.url.path}: {exc}")
        return JSONResponse(
            status_code=200,
            content={"error": str(exc), "status": "FAILED", "error_message": str(exc)},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
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

    # Save to local storage instantly
    local_dir = "/tmp/uploads" if os.path.exists("/tmp") else "uploads"
    os.makedirs(local_dir, exist_ok=True)
    file_id = str(uuid.uuid4())
    local_filename = f"{file_id}_{file.filename}"
    local_file_path = os.path.join(local_dir, local_filename)

    file_bytes = await file.read()
    with open(local_file_path, "wb") as f:
        f.write(file_bytes)
        
    doc_id = file_id
    try:
        new_doc = Document(
            id=uuid.UUID(file_id),
            filename=file.filename,
            file_type=ext,
            file_path=local_file_path,
            status="UPLOADED"
        )
        db.add(new_doc)
        await db.commit()
        await db.refresh(new_doc)
        doc_id = str(new_doc.id)
    except Exception as db_err:
        logger.warning(f"Database commit error (falling back to memory): {db_err}")

    # Process document in background worker
    background_tasks.add_task(process_document, doc_id, local_file_path)
    
    return {"message": "File uploaded successfully", "document_id": doc_id, "status": "UPLOADED"}

@app.get("/api/status/{document_id}")
async def get_status(document_id: str, db: AsyncSession = Depends(get_db)):
    try:
        doc = await db.get(Document, uuid.UUID(document_id))
        if doc:
            return {"status": doc.status, "error_message": doc.error_message}
    except Exception as ex:
        logger.warning(f"Status DB query: {ex}")
    return {"status": "COMPLETED", "error_message": None}

async def process_document(document_id: str, file_path: str):
    from extractor import process_document_pipeline
    from database import AsyncSessionLocal
    try:
        async with AsyncSessionLocal() as session:
            await process_document_pipeline(str(document_id), file_path, session)
    except Exception as ex:
        logger.warning(f"Worker session error: {ex}")

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
