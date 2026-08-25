from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import Node, Relationship
import uuid

async def get_graph_neighborhood(node_id: str, hops: int, db: AsyncSession):
    """
    Returns 1-hop or 2-hop neighborhood for a given node.
    """
    node_uuid = uuid.UUID(node_id)
    
    # Find base node
    base_node = await db.get(Node, node_uuid)
    if not base_node:
        return None
        
    nodes_dict = {str(base_node.id): base_node}
    edges = []
    
    current_frontier = [node_uuid]
    visited = set([node_uuid])
    
    for _ in range(hops):
        if not current_frontier:
            break
            
        stmt = select(Relationship).where(
            (Relationship.source_node_id.in_(current_frontier)) | 
            (Relationship.target_node_id.in_(current_frontier))
        )
        
        result = await db.execute(stmt)
        rels = result.scalars().all()
        
        next_frontier = []
        for rel in rels:
            edges.append(rel)
            
            src = rel.source_node_id
            tgt = rel.target_node_id
            
            for n_id in (src, tgt):
                if n_id not in visited:
                    visited.add(n_id)
                    next_frontier.append(n_id)
                    # Fetch node
                    n = await db.get(Node, n_id)
                    if n:
                        nodes_dict[str(n.id)] = n
                        
        current_frontier = next_frontier
        
    return {
        "nodes": list(nodes_dict.values()),
        "edges": edges
    }

async def calculate_overlap(node1_id: str, node2_id: str, db: AsyncSession):
    # E.g. find shared datasets, methods, or topics between two papers or researchers
    # This is a simplified 2-hop path intersection for MVP
    
    stmt1 = select(Relationship.target_node_id).where(Relationship.source_node_id == uuid.UUID(node1_id))
    stmt2 = select(Relationship.target_node_id).where(Relationship.source_node_id == uuid.UUID(node2_id))
    
    res1 = (await db.execute(stmt1)).scalars().all()
    res2 = (await db.execute(stmt2)).scalars().all()
    
    overlap_ids = set(res1).intersection(set(res2))
    
    if not overlap_ids:
        return {"overlap_score": 0, "evidence": []}
        
    # Fetch overlap nodes for evidence
    evidence_nodes = []
    for o_id in overlap_ids:
        n = await db.get(Node, o_id)
        if n:
            evidence_nodes.append({"id": str(n.id), "name": n.name, "type": n.type})
            
    # Simple score based on number of shared entities
    score = len(evidence_nodes) * 10
    
    return {
        "overlap_score": min(100, score),
        "evidence": evidence_nodes
    }
