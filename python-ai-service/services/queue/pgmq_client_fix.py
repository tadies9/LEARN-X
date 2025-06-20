"""
Enhanced PGMQ client with proper type handling for archive function.
Fixes type casting issues with PGMQ archive function.
"""

import asyncio
import json
from typing import List, Dict, Any, Optional, TypeVar, Generic
from datetime import datetime
import asyncpg
from pydantic import BaseModel

from core.logging import get_logger
from app.config import settings

logger = get_logger(__name__)

T = TypeVar('T', bound=BaseModel)


class PGMQMessage(BaseModel):
    """PGMQ message structure"""
    msg_id: int
    read_ct: int
    enqueued_at: datetime
    vt: datetime
    message: Dict[str, Any]


class PGMQClient:
    """
    Async PGMQ client for Python with enhanced error handling.
    Provides interface to PostgreSQL Message Queue.
    """
    
    def __init__(self, connection_pool: asyncpg.Pool):
        self.pool = connection_pool
        self._shutdown = False
        
    async def send(
        self,
        queue_name: str,
        message: Dict[str, Any],
        delay: int = 0
    ) -> int:
        """
        Send a message to the queue.
        
        Args:
            queue_name: Name of the queue
            message: Message payload
            delay: Delay in seconds before message is visible
            
        Returns:
            Message ID
        """
        try:
            async with self.pool.acquire() as conn:
                result = await conn.fetchval(
                    "SELECT pgmq.send($1, $2, $3)",
                    queue_name,
                    json.dumps(message),
                    delay
                )
                
                logger.info(
                    "Message sent to queue",
                    queue=queue_name,
                    msg_id=result,
                    delay=delay
                )
                
                return result
                
        except Exception as e:
            logger.error(
                "Failed to send message",
                queue=queue_name,
                error=str(e)
            )
            raise
    
    async def send_batch(
        self,
        queue_name: str,
        messages: List[Dict[str, Any]],
        delay: int = 0
    ) -> List[int]:
        """
        Send multiple messages to the queue.
        
        Args:
            queue_name: Name of the queue
            messages: List of message payloads
            delay: Delay in seconds before messages are visible
            
        Returns:
            List of message IDs
        """
        try:
            messages_json = [json.dumps(msg) for msg in messages]
            
            async with self.pool.acquire() as conn:
                result = await conn.fetch(
                    "SELECT * FROM pgmq.send_batch($1, $2::jsonb[], $3)",
                    queue_name,
                    messages_json,
                    delay
                )
                
                msg_ids = [row[0] for row in result]
                
                logger.info(
                    "Batch sent to queue",
                    queue=queue_name,
                    count=len(messages),
                    msg_ids=msg_ids
                )
                
                return msg_ids
                
        except Exception as e:
            logger.error(
                "Failed to send batch",
                queue=queue_name,
                count=len(messages),
                error=str(e)
            )
            raise
    
    async def read(
        self,
        queue_name: str,
        vt: int = 30,
        qty: int = 1
    ) -> List[PGMQMessage]:
        """
        Read messages from the queue.
        
        Args:
            queue_name: Name of the queue
            vt: Visibility timeout in seconds
            qty: Number of messages to read
            
        Returns:
            List of messages
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM pgmq.read($1, $2, $3)",
                    queue_name,
                    vt,
                    qty
                )
                
                messages = []
                for row in rows:
                    messages.append(PGMQMessage(
                        msg_id=row['msg_id'],
                        read_ct=row['read_ct'],
                        enqueued_at=row['enqueued_at'],
                        vt=row['vt'],
                        message=json.loads(row['message'])
                    ))
                
                if messages:
                    logger.debug(
                        "Messages read from queue",
                        queue=queue_name,
                        count=len(messages)
                    )
                
                return messages
                
        except Exception as e:
            logger.error(
                "Failed to read messages",
                queue=queue_name,
                error=str(e)
            )
            raise
    
    async def read_with_poll(
        self,
        queue_name: str,
        vt: int = 30,
        qty: int = 10,
        poll_timeout_s: int = 5,
        poll_interval_ms: int = 100
    ) -> List[PGMQMessage]:
        """
        Read messages with long polling.
        
        Args:
            queue_name: Name of the queue
            vt: Visibility timeout in seconds
            qty: Number of messages to read
            poll_timeout_s: Max time to wait for messages
            poll_interval_ms: Polling interval in milliseconds
            
        Returns:
            List of messages
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM pgmq.read_with_poll($1, $2, $3, $4, $5)",
                    queue_name,
                    vt,
                    qty,
                    poll_timeout_s,
                    poll_interval_ms
                )
                
                messages = []
                for row in rows:
                    messages.append(PGMQMessage(
                        msg_id=row['msg_id'],
                        read_ct=row['read_ct'],
                        enqueued_at=row['enqueued_at'],
                        vt=row['vt'],
                        message=json.loads(row['message'])
                    ))
                
                return messages
                
        except asyncpg.exceptions.UndefinedFunctionError as e:
            # Fallback to regular read if poll function doesn't exist
            logger.warning(
                "read_with_poll function not available, falling back to regular read",
                queue=queue_name,
                error=str(e)
            )
            return await self.read(queue_name, vt, qty)
        except asyncpg.exceptions.ConnectionDoesNotExistError as e:
            logger.error(
                "Database connection lost during polling",
                queue=queue_name,
                error=str(e)
            )
            # Return empty list instead of raising to allow retry
            return []
        except asyncpg.exceptions.InvalidSQLStatementNameError as e:
            # Circuit breaker for prepared statement errors - PgBouncer issue
            logger.error(
                "Invalid prepared statement - PgBouncer dropped session state",
                queue=queue_name,
                error=str(e),
                error_type=type(e).__name__
            )
            # Return empty list to avoid retry loop
            return []
        except Exception as e:
            logger.error(
                "Failed to read with poll",
                queue=queue_name,
                error=str(e),
                error_type=type(e).__name__
            )
            # Return empty list for non-critical errors to allow continuation
            if "timeout" in str(e).lower() or "connection" in str(e).lower():
                return []
            # Also handle prepared statement errors in general exception
            if "prepared statement" in str(e).lower():
                return []
            raise
    
    async def delete(self, queue_name: str, msg_id: int) -> bool:
        """
        Delete a message from the queue.
        
        Args:
            queue_name: Name of the queue
            msg_id: Message ID to delete
            
        Returns:
            True if deleted successfully
        """
        try:
            async with self.pool.acquire() as conn:
                result = await conn.fetchval(
                    "SELECT pgmq.delete($1, $2)",
                    queue_name,
                    msg_id
                )
                
                logger.debug(
                    "Message deleted",
                    queue=queue_name,
                    msg_id=msg_id,
                    success=result
                )
                
                return result
                
        except Exception as e:
            logger.error(
                "Failed to delete message",
                queue=queue_name,
                msg_id=msg_id,
                error=str(e)
            )
            raise
    
    async def archive(self, queue_name: str, msg_id: int) -> bool:
        """
        Archive a message (move to dead letter queue) with proper type handling.
        
        Args:
            queue_name: Name of the queue
            msg_id: Message ID to archive
            
        Returns:
            True if archived successfully
        """
        try:
            async with self.pool.acquire() as conn:
                # CRITICAL FIX: Cast msg_id to BIGINT explicitly
                # PGMQ's archive function expects BIGINT but Python int might be interpreted differently
                result = await conn.fetchval(
                    "SELECT pgmq.archive($1, $2::BIGINT)",
                    queue_name,
                    int(msg_id)  # Ensure it's a Python int
                )
                
                logger.info(
                    "Message archived",
                    queue=queue_name,
                    msg_id=msg_id,
                    success=result
                )
                
                return bool(result) if result is not None else False
                
        except asyncpg.exceptions.DataError as e:
            # Handle type casting errors specifically
            logger.error(
                "Data type error archiving message - attempting alternate approach",
                queue=queue_name,
                msg_id=msg_id,
                error=str(e),
                msg_id_type=type(msg_id).__name__
            )
            
            # Try with explicit conversion
            try:
                async with self.pool.acquire() as conn:
                    # Use a different approach - fetch and re-insert
                    result = await conn.fetchval(
                        f"SELECT pgmq.archive('{queue_name}', {int(msg_id)})"
                    )
                    return bool(result) if result is not None else False
            except Exception as e2:
                logger.error(
                    "Failed to archive with alternate approach",
                    queue=queue_name,
                    msg_id=msg_id,
                    error=str(e2)
                )
                raise e  # Re-raise original error
                
        except Exception as e:
            logger.error(
                "Failed to archive message",
                queue=queue_name,
                msg_id=msg_id,
                error=str(e),
                error_type=type(e).__name__
            )
            raise
    
    async def get_metrics(self, queue_name: str) -> Optional[Dict[str, Any]]:
        """
        Get queue metrics.
        
        Args:
            queue_name: Name of the queue
            
        Returns:
            Queue metrics dictionary
        """
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    SELECT 
                        queue_name,
                        queue_length,
                        oldest_msg_age_sec,
                        newest_msg_age_sec,
                        total_messages
                    FROM pgmq.metrics
                    WHERE queue_name = $1
                    """,
                    queue_name
                )
                
                if row:
                    return dict(row)
                    
                return None
                
        except Exception as e:
            logger.error(
                "Failed to get metrics",
                queue=queue_name,
                error=str(e)
            )
            raise
    
    async def health_check(self) -> bool:
        """
        Check if the connection pool is healthy.
        
        Returns:
            True if healthy, False otherwise
        """
        try:
            async with self.pool.acquire() as conn:
                result = await conn.fetchval("SELECT 1")
                return result == 1
        except Exception as e:
            logger.error("PGMQ health check failed", error=str(e))
            return False
    
    def shutdown(self):
        """Signal shutdown to stop processing"""
        self._shutdown = True