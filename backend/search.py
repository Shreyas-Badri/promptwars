from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, text
from models import Node, Embedding
import uuid

async def semantic_search(query: str, db: AsyncSession, limit: int = 10):
    from services import FallbackEmbeddingService
    
    # Generate query embedding
    embedding_service = FallbackEmbeddingService()
    try:
        query_embed = await embedding_service.generate([query])
    except:
        query_embed = None
        
    if not query_embed:
        # Fallback to text search if embedding fails
        return await text_search(query, db, limit)
        
    query_vector = query_embed[0]
    
    # pgvector cosine similarity <->
    stmt = (
        select(Node, Embedding.embedding.cosine_distance(query_vector).label("distance"))
        .join(Embedding, Node.id == Embedding.node_id)
        .order_by(text("distance ASC"))
        .limit(limit)
    )
    try:
        result = await db.execute(stmt)
        rows = result.all()
    except Exception:
        return await text_search(query, db, limit)
        
    if not rows:
        return await text_search(query, db, limit)
        
    return [{"node": row.Node, "distance": row.distance} for row in rows]

async def text_search(query: str, db: AsyncSession, limit: int = 10):
    try:
        stmt = (
            select(Node)
            .where(Node.name.ilike(f"%{query}%"))
            .limit(limit)
        )
        result = await db.execute(stmt)
        nodes = result.scalars().all()
        return [{"node": node, "distance": None} for node in nodes]
    except Exception:
        return []
