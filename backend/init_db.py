import asyncio
from sqlalchemy import text
from database import engine
import os

async def init():
    async with engine.begin() as conn:
        schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
        with open(schema_path, "r", encoding="utf-8") as f:
            sql = f.read()
        
        # We need to execute the schema.sql contents
        # SQLAlchemy connection allows executing text blocks
        await conn.execute(text(sql))
    print("Database initialized successfully.")

if __name__ == "__main__":
    asyncio.run(init())
