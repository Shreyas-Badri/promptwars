import logging
import os
import json
from abc import ABC, abstractmethod
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# --- Interfaces ---
class EmbeddingService(ABC):
    @abstractmethod
    async def generate(self, texts: list[str]) -> list[list[float]]:
        pass

class AIExtractionService(ABC):
    @abstractmethod
    async def extract(self, text: str) -> dict:
        pass

class StorageService(ABC):
    @abstractmethod
    async def upload(self, file_path: str, file_bytes: bytes) -> str:
        pass

# --- Supabase Storage ---
class SupabaseStorage(StorageService):
    def __init__(self):
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("SUPABASE_ANON_KEY", ""))
        try:
            from supabase import create_client
            self.client = create_client(url, key) if url and key else None
        except:
            self.client = None

    async def upload(self, file_path: str, file_bytes: bytes) -> str:
        if not self.client:
            # Fallback to local
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "wb") as f:
                f.write(file_bytes)
            return file_path
        
        bucket = "documents"
        try:
            self.client.storage.get_bucket(bucket)
        except:
            self.client.storage.create_bucket(bucket)
            
        self.client.storage.from_(bucket).upload(file_path, file_bytes)
        return self.client.storage.from_(bucket).get_public_url(file_path)

# --- Embedding Adapters ---
class LocalGteEmbedding(EmbeddingService):
    def __init__(self):
        try:
            self.model = SentenceTransformer("Supabase/gte-small")
        except:
            self.model = None

    async def generate(self, texts: list[str]) -> list[list[float]]:
        if not self.model:
            raise Exception("Local model not initialized")
        return self.model.encode(texts).tolist()

class GeminiEmbedding(EmbeddingService):
    async def generate(self, texts: list[str]) -> list[list[float]]:
        import google.generativeai as genai
        key = os.environ.get("GEMINI_API_KEY")
        if not key: raise Exception("Missing Gemini key")
        genai.configure(api_key=key)
        res = genai.embed_content(model="models/embedding-001", content=texts)
        if isinstance(res['embedding'][0], list):
             return res['embedding']
        return [res['embedding']]

class GroqEmbedding(EmbeddingService):
    async def generate(self, texts: list[str]) -> list[list[float]]:
        raise Exception("Groq embeddings not natively available, falling back")

class HuggingFaceEmbedding(EmbeddingService):
    async def generate(self, texts: list[str]) -> list[list[float]]:
        raise Exception("HF embedding requires distinct HTTP call, falling back")

class FallbackEmbeddingService(EmbeddingService):
    def __init__(self):
        self.providers = [
            ("Supabase Local gte-small", LocalGteEmbedding()),
            ("Gemini", GeminiEmbedding()),
            ("Groq", GroqEmbedding()),
            ("HuggingFace", HuggingFaceEmbedding())
        ]

    async def generate(self, texts: list[str]) -> list[list[float]]:
        for name, provider in self.providers:
            try:
                logger.info(f"Trying embedding provider: {name}")
                return await provider.generate(texts)
            except Exception as e:
                logger.warning(f"Embedding provider {name} unavailable: {e}")
        raise Exception("All embedding providers failed")

# --- Extraction Adapters ---
class GeminiExtraction(AIExtractionService):
    async def extract(self, text: str) -> dict:
        import google.generativeai as genai
        key = os.environ.get("GEMINI_API_KEY")
        if not key: raise Exception("Missing Gemini key")
        genai.configure(api_key=key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"Extract researchers, papers, datasets, methods, and topics. Format as JSON with 'nodes' (id, name, type) and 'relationships' (source_id, target_id, type). Data: {text[:5000]}"
        response = model.generate_content(prompt)
        text_resp = response.text
        start = text_resp.find('{')
        end = text_resp.rfind('}') + 1
        return json.loads(text_resp[start:end])

class FallbackExtractionService(AIExtractionService):
    def __init__(self):
        self.providers = [
            ("Gemini", GeminiExtraction())
        ]

    async def extract(self, text: str) -> dict:
        for name, provider in self.providers:
            try:
                return await provider.extract(text)
            except Exception as e:
                logger.warning(f"Extraction provider {name} unavailable: {e}")
        return {"nodes": [], "relationships": []}
