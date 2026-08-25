import json
import logging

try:
    from vertexai.language_models import TextGenerationModel, TextEmbeddingModel
    import vertexai
except ImportError:
    vertexai = None

try:
    from sentence_transformers import SentenceTransformer
    # Only load when needed to save memory, or preload if RAM allows
    local_model = SentenceTransformer("all-MiniLM-L6-v2")
except ImportError:
    local_model = None

logger = logging.getLogger(__name__)

async def extract_entities_and_relationships(text: str):
    prompt = f"""
    Extract researchers, papers, datasets, methods, and topics from the text below. 
    Format the output as JSON with "nodes" and "relationships".
    
    Data:
    ---
    {text[:5000]}
    ---
    """
    
    # Vertex AI extraction attempt
    try:
        if vertexai:
            model = TextGenerationModel.from_pretrained("text-bison")
            response = model.predict(prompt)
            # Parse JSON from response
            try:
                # Naive parse
                data = json.loads(response.text)
                return data
            except:
                pass
    except Exception as e:
        logger.error(f"Vertex AI LLM failed: {e}")
        
    return {"nodes": [], "relationships": []}

async def generate_embeddings(texts: list[str]):
    try:
        if vertexai:
            model = TextEmbeddingModel.from_pretrained("textembedding-gecko@003")
            embeddings = model.get_embeddings(texts)
            return [e.values for e in embeddings]
    except Exception as e:
        logger.error(f"Vertex embedding failed, falling back to local: {e}")
        
    if local_model:
        embeds = local_model.encode(texts)
        return embeds.tolist()
    
    return []
