from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from pydantic_settings import BaseSettings
import os
import re

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/graphis")

settings = Settings()

raw_url = settings.DATABASE_URL
if raw_url.startswith("postgres://"):
    raw_url = raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+asyncpg://"):
    raw_url = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Remove sslmode query parameter if present for asyncpg compatibility
clean_url = re.sub(r'[\?\&]sslmode=[^&]+', '', raw_url)

import ssl

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

connect_args = {}
if "supabase" in raw_url or "sslmode=require" in settings.DATABASE_URL or "amazonaws.com" in raw_url or "pooler" in raw_url:
    connect_args["ssl"] = ssl_context
    connect_args["statement_cache_size"] = 0

engine = create_async_engine(
    clean_url, 
    connect_args=connect_args, 
    echo=False,
    pool_pre_ping=True
)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    try:
        async with AsyncSessionLocal() as session:
            try:
                yield session
            except Exception as ex:
                await session.rollback()
                raise ex
    except Exception as conn_err:
        import logging
        logging.getLogger(__name__).warning(f"Database connection failed, yielding None: {conn_err}")
        yield None
