"""
Embedding generation handler for PGMQ.
Processes chunks and generates embeddings using OpenAI.
"""

from typing import Any, Dict
from datetime import datetime
from core.logging import get_logger
from services.queue.pgmq_client import PGMQClient, PGMQMessage
import openai
from app.config import settings

logger = get_logger(__name__)


class EmbeddingHandler:
    """
    Handler for embedding generation jobs.
    Processes chunks and stores embeddings in the database.
    """
    
    def __init__(self, pgmq_client: PGMQClient, db_pool):
        self.pgmq = pgmq_client
        self.db_pool = db_pool
        # Initialize OpenAI client
        if settings.openai_api_key:
            openai.api_key = settings.openai_api_key
        else:
            logger.warning("OpenAI API key not configured")
        logger.info("EmbeddingHandler initialized with OpenAI embeddings")
        
    async def process(self, message: PGMQMessage) -> None:
        """
        Process an embedding generation job.
        
        Args:
            message: PGMQ message containing job details
        """
        job_data = message.message
        chunk_id = job_data.get('chunk_id')
        content = job_data.get('content')
        
        logger.info(
            "Processing embedding job",
            chunk_id=chunk_id,
            msg_id=message.msg_id,
            content_length=len(content) if content else 0
        )
        
        try:
            # Skip empty content
            if not content or not content.strip():
                logger.warning("Skipping empty chunk", chunk_id=chunk_id)
                return
                
            # Generate embedding using OpenAI directly
            import asyncio
            client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
            
            response = await client.embeddings.create(
                model="text-embedding-3-small",
                input=content,
                dimensions=1536
            )
            
            embedding = response.data[0].embedding
            
            # Store embedding in database
            await self._store_embedding(
                chunk_id=chunk_id,
                embedding=embedding,
                model_version="text-embedding-3-small"
            )
            
            logger.info(
                "Embedding stored successfully",
                chunk_id=chunk_id,
                dimensions=len(embedding)
            )
                
        except Exception as e:
            logger.error(
                "Error processing embedding job",
                chunk_id=chunk_id,
                error=str(e)
            )
            raise
            
    async def _store_embedding(
        self,
        chunk_id: str,
        embedding: list[float],
        model_version: str
    ) -> None:
        """Store embedding in the database"""
        # Convert embedding list to PostgreSQL vector format
        embedding_str = '[' + ','.join(str(x) for x in embedding) + ']'
        
        async with self.db_pool.acquire() as conn:
            # Check if embedding already exists
            existing = await conn.fetchval(
                "SELECT id FROM file_embeddings WHERE chunk_id = $1",
                chunk_id
            )
            
            if existing:
                # Update existing embedding
                await conn.execute(
                    """
                    UPDATE file_embeddings 
                    SET embedding = $1::vector, model_version = $2, updated_at = $3
                    WHERE chunk_id = $4
                    """,
                    embedding_str,
                    model_version,
                    datetime.utcnow(),
                    chunk_id
                )
            else:
                # Insert new embedding
                await conn.execute(
                    """
                    INSERT INTO file_embeddings (chunk_id, embedding, model_version, created_at)
                    VALUES ($1, $2::vector, $3, $4)
                    """,
                    chunk_id,
                    embedding_str,
                    model_version,
                    datetime.utcnow()
                )