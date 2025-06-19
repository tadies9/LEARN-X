"""
PGMQ client wrapper for Python.
Integrates with existing PGMQ infrastructure.
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
    Async PGMQ client for Python.
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
        poll_timeout_s: int = 5
    ) -> List[PGMQMessage]:
        """
        Read messages with long polling.
        
        Args:
            queue_name: Name of the queue
            vt: Visibility timeout in seconds
            qty: Number of messages to read
            poll_timeout_s: Max time to wait for messages
            
        Returns:
            List of messages
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT * FROM pgmq.read_with_poll($1, $2, $3, $4)",
                    queue_name,
                    vt,
                    qty,
                    poll_timeout_s
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
                
        except Exception as e:
            logger.error(
                "Failed to read with poll",
                queue=queue_name,
                error=str(e)
            )
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
        Archive a message (move to dead letter queue).
        
        Args:
            queue_name: Name of the queue
            msg_id: Message ID to archive
            
        Returns:
            True if archived successfully
        """
        try:
            async with self.pool.acquire() as conn:
                result = await conn.fetchval(
                    "SELECT pgmq.archive($1, $2)",
                    queue_name,
                    msg_id
                )
                
                logger.info(
                    "Message archived",
                    queue=queue_name,
                    msg_id=msg_id,
                    success=result
                )
                
                return result
                
        except Exception as e:
            logger.error(
                "Failed to archive message",
                queue=queue_name,
                msg_id=msg_id,
                error=str(e)
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
    
    def shutdown(self):
        """Signal shutdown to stop processing"""
        self._shutdown = True