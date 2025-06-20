"""
Enhanced Embedding generation handler with race condition fixes.
Handles cases where chunks might be deleted before embeddings are processed.
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
    Handler for embedding generation jobs with race condition protection.
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
        Process an embedding generation job with race condition protection.
        
        Args:
            message: PGMQ message containing job details
        """
        job_data = message.message
        chunk_id = job_data.get('chunk_id')
        content = job_data.get('content')
        file_id = job_data.get('file_id')
        
        logger.info(
            "Processing embedding job",
            chunk_id=chunk_id,
            file_id=file_id,
            msg_id=message.msg_id,
            content_length=len(content) if content else 0
        )
        
        try:
            # Skip empty content
            if not content or not content.strip():
                logger.warning("Skipping empty chunk", chunk_id=chunk_id)
                return
            
            # CRITICAL: Check if chunk still exists before processing
            async with self.db_pool.acquire() as conn:
                chunk_exists = await conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM file_chunks WHERE id = $1)",
                    chunk_id
                )
                
                if not chunk_exists:
                    logger.warning(
                        "Chunk no longer exists, skipping embedding generation",
                        chunk_id=chunk_id,
                        file_id=file_id
                    )
                    # Return successfully - this is not an error, just a race condition
                    return
                
                # Also verify the chunk belongs to the expected file
                actual_file_id = await conn.fetchval(
                    "SELECT file_id FROM file_chunks WHERE id = $1",
                    chunk_id
                )
                
                if str(actual_file_id) != str(file_id):
                    logger.warning(
                        "Chunk belongs to different file, skipping",
                        chunk_id=chunk_id,
                        expected_file_id=file_id,
                        actual_file_id=actual_file_id
                    )
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
            
            # Store embedding in database with additional safety check
            stored = await self._store_embedding(
                chunk_id=chunk_id,
                embedding=embedding,
                model_version="text-embedding-3-small"
            )
            
            if stored:
                logger.info(
                    "Embedding stored successfully",
                    chunk_id=chunk_id,
                    dimensions=len(embedding)
                )
            else:
                logger.warning(
                    "Failed to store embedding - chunk might have been deleted",
                    chunk_id=chunk_id
                )
                
        except Exception as e:
            # Check if it's a foreign key constraint violation
            error_str = str(e).lower()
            if "foreign key constraint" in error_str or "violates foreign key" in error_str:
                logger.warning(
                    "Foreign key constraint violation - chunk was likely deleted",
                    chunk_id=chunk_id,
                    error=str(e)
                )
                # Don't raise - this is expected in race conditions
                return
            
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
    ) -> bool:
        """
        Store embedding in the database with race condition protection.
        
        Returns:
            True if stored successfully, False if chunk no longer exists
        """
        # Convert embedding list to PostgreSQL vector format
        embedding_str = '[' + ','.join(str(x) for x in embedding) + ']'
        
        async with self.db_pool.acquire() as conn:
            try:
                # Use a transaction to ensure atomicity
                async with conn.transaction():
                    # First check if chunk still exists
                    chunk_exists = await conn.fetchval(
                        "SELECT EXISTS(SELECT 1 FROM file_chunks WHERE id = $1)",
                        chunk_id
                    )
                    
                    if not chunk_exists:
                        logger.debug(
                            "Chunk deleted before embedding could be stored",
                            chunk_id=chunk_id
                        )
                        return False
                    
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
                    
                    return True
                    
            except Exception as e:
                error_str = str(e).lower()
                if "foreign key constraint" in error_str or "violates foreign key" in error_str:
                    logger.debug(
                        "Foreign key constraint - chunk was deleted during transaction",
                        chunk_id=chunk_id
                    )
                    return False
                raise