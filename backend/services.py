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
        except Exception as ex:
            logger.warning(f"Supabase client init skipped: {ex}")
            self.client = None

    async def upload(self, file_path: str, file_bytes: bytes) -> str:
        if not self.client:
            return file_path
        
        try:
            bucket = "documents"
            try:
                self.client.storage.get_bucket(bucket)
            except Exception:
                try:
                    self.client.storage.create_bucket(bucket, options={"public": True})
                except Exception:
                    pass
                
            self.client.storage.from_(bucket).upload(file_path, file_bytes, file_options={"upsert": "true"})
            return self.client.storage.from_(bucket).get_public_url(file_path)
        except Exception as e:
            logger.warning(f"Supabase remote storage upload bypassed: {e}")
            return file_path

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
        
        results = []
        for t in texts:
            for m in ["models/text-embedding-004", "models/embedding-001"]:
                try:
                    res = genai.embed_content(model=m, content=t)
                    emb = res.get('embedding')
                    if isinstance(emb, dict) and 'values' in emb:
                        results.append(emb['values'])
                        break
                    elif isinstance(emb, list):
                        results.append(emb)
                        break
                except Exception as ex:
                    logger.warning(f"Gemini model {m} failed: {ex}")
                    continue
        if len(results) == len(texts):
            return results
        raise Exception("Gemini embedding failed to produce results")

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
        
        prompt = f"Extract researchers, papers, datasets, methods, and topics. Output JSON only with 'nodes' (list of {{id, name, type}}) and 'relationships' (list of {{source_id, target_id, type}}). Data:\n{text[:5000]}"
        
        for model_name in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                text_resp = response.text
                start = text_resp.find('{')
                end = text_resp.rfind('}') + 1
                if start != -1 and end != 0:
                    return json.loads(text_resp[start:end])
            except Exception as e:
                logger.warning(f"Gemini model {model_name} failed: {e}")
                continue
        raise Exception("All Gemini models failed")

class GroqExtraction(AIExtractionService):
    async def extract(self, text: str) -> dict:
        from groq import Groq
        key = os.environ.get("GROQ_API_KEY")
        if not key:
            raise Exception("Missing Groq key")
        client = Groq(api_key=key)
        prompt = f"Extract researchers, papers, datasets, methods, and topics from this research data. Output JSON only with 'nodes' (list of {{id, name, type}}) and 'relationships' (list of {{source_id, target_id, type}}). Data:\n{text[:5000]}"
        
        for model_id in ["qwen-2.5-32b", "qwen/qwen3-32b", "llama-3.3-70b-versatile", "gemma2-9b-it"]:
            try:
                completion = client.chat.completions.create(
                    model=model_id,
                    messages=[
                        {"role": "system", "content": "You are a specialized scientific entity and knowledge graph extractor. Return valid JSON only."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"}
                )
                res_content = completion.choices[0].message.content
                return json.loads(res_content)
            except Exception as e:
                logger.warning(f"Groq model {model_id} failed: {e}")
                continue
        raise Exception("All Groq models failed")

class FallbackExtractionService(AIExtractionService):
    def __init__(self):
        self.providers = [
            ("Gemini", GeminiExtraction()),
            ("Groq-Qwen", GroqExtraction())
        ]

    async def extract(self, text: str) -> dict:
        for name, provider in self.providers:
            try:
                logger.info(f"Trying extraction provider: {name}")
                return await provider.extract(text)
            except Exception as e:
                logger.warning(f"Extraction provider {name} unavailable: {e}")
        return {"nodes": [], "relationships": []}
