"""
Generic job processor for PGMQ queues.
Routes jobs to appropriate handlers.
"""

import asyncio
from typing import Dict, Any, Optional
from datetime import datetime

from core.logging import get_logger
from app.config import settings
from services.queue.pgmq_client import PGMQClient, PGMQMessage
from services.queue.handlers.file_processing import FileProcessingHandler
from services.queue.handlers.embedding import EmbeddingHandler
from services.queue.handlers.content_gen import ContentGenerationHandler

logger = get_logger(__name__)


class JobProcessor:
    """
    Main job processor that routes jobs to handlers.
    Manages multiple queue processing with proper concurrency.
    """
    
    QUEUE_CONFIGS = {
        'file_processing': {
            'visibility_timeout': 300,  # 5 minutes for file processing
            'batch_size': 5,
            'poll_timeout': 10
        },
        'embeddings': {
            'visibility_timeout': 60,   # 1 minute for embeddings
            'batch_size': 50,
            'poll_timeout': 5
        },
        'content_generation': {
            'visibility_timeout': 120,  # 2 minutes for content
            'batch_size': 10,
            'poll_timeout': 10
        }
    }
    
    def __init__(self, pgmq_client: PGMQClient, db_pool):
        self.pgmq = pgmq_client
        self.db_pool = db_pool
        self._shutdown = False
        self._tasks = []
        
        # Initialize handlers
        self.handlers = {
            'file_processing': FileProcessingHandler(pgmq_client, db_pool),
            'embeddings': EmbeddingHandler(pgmq_client, db_pool),
            'content_generation': ContentGenerationHandler(pgmq_client, db_pool)
        }
        
    async def start(self):
        """Start processing all configured queues"""
        logger.info("Starting job processor")
        
        # Start a task for each queue
        for queue_name, config in self.QUEUE_CONFIGS.items():
            task = asyncio.create_task(
                self._process_queue(queue_name, config)
            )
            self._tasks.append(task)
            
        logger.info(
            "Job processor started",
            queues=list(self.QUEUE_CONFIGS.keys())
        )
        
        # Wait for all tasks to complete (they won't unless stopped)
        await asyncio.gather(*self._tasks, return_exceptions=True)
        
    async def stop(self):
        """Stop all queue processing"""
        logger.info("Stopping job processor")
        self._shutdown = True
        
        # Cancel all tasks
        for task in self._tasks:
            task.cancel()
            
        # Wait for tasks to finish
        await asyncio.gather(*self._tasks, return_exceptions=True)
        
        logger.info("Job processor stopped")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Check health of the job processor and queues.
        
        Returns:
            Health status dictionary
        """
        try:
            # Check PGMQ connection
            pgmq_healthy = await self.pgmq.health_check()
            
            # Check queue metrics
            queue_status = {}
            for queue_name in self.QUEUE_CONFIGS.keys():
                try:
                    metrics = await self.pgmq.get_metrics(queue_name)
                    queue_status[queue_name] = {
                        "status": "healthy",
                        "metrics": metrics
                    }
                except Exception as e:
                    queue_status[queue_name] = {
                        "status": "error",
                        "error": str(e)
                    }
            
            return {
                "status": "healthy" if pgmq_healthy else "unhealthy",
                "pgmq_connection": "healthy" if pgmq_healthy else "unhealthy",
                "queues": queue_status,
                "active_tasks": len(self._tasks),
                "shutdown": self._shutdown
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "active_tasks": len(self._tasks),
                "shutdown": self._shutdown
            }
        
    async def _process_queue(self, queue_name: str, config: Dict[str, Any]):
        """
        Process a specific queue continuously.
        
        Args:
            queue_name: Name of the queue to process
            config: Queue configuration
        """
        handler = self.handlers.get(queue_name)
        if not handler:
            logger.error(f"No handler for queue: {queue_name}")
            return
            
        logger.info(f"Processing queue: {queue_name}", config=config)
        
        while not self._shutdown:
            try:
                # Read messages with long polling
                messages = await self.pgmq.read_with_poll(
                    queue_name=queue_name,
                    vt=config['visibility_timeout'],
                    qty=config['batch_size'],
                    poll_timeout_s=config['poll_timeout']
                )
                
                if messages:
                    # Process messages concurrently
                    await self._process_messages(
                        queue_name,
                        messages,
                        handler
                    )
                    
            except asyncio.CancelledError:
                logger.info(f"Queue processing cancelled: {queue_name}")
                break
                
            except Exception as e:
                error_msg = str(e).lower()
                if "connection" in error_msg or "timeout" in error_msg:
                    logger.warning(
                        f"Connection issue in queue: {queue_name}",
                        error=str(e)
                    )
                    # Shorter wait for connection issues
                    await asyncio.sleep(2)
                elif "undefined function" in error_msg:
                    logger.warning(
                        f"PGMQ function not available for queue: {queue_name}",
                        error=str(e)
                    )
                    # Longer wait for function issues
                    await asyncio.sleep(10)
                else:
                    logger.error(
                        f"Error processing queue: {queue_name}",
                        error=str(e),
                        error_type=type(e).__name__
                    )
                    # Standard wait for other errors
                    await asyncio.sleep(5)
                
    async def _process_messages(
        self,
        queue_name: str,
        messages: list[PGMQMessage],
        handler: Any
    ):
        """
        Process a batch of messages.
        
        Args:
            queue_name: Queue name
            messages: List of messages to process
            handler: Handler for this queue type
        """
        logger.info(
            f"Processing batch from {queue_name}",
            count=len(messages)
        )
        
        # Process messages concurrently
        tasks = []
        for message in messages:
            task = asyncio.create_task(
                self._process_single_message(
                    queue_name,
                    message,
                    handler
                )
            )
            tasks.append(task)
            
        # Wait for all messages to be processed
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Log results
        success_count = sum(1 for r in results if r is None)
        error_count = sum(1 for r in results if r is not None)
        
        logger.info(
            f"Batch processing complete for {queue_name}",
            success=success_count,
            errors=error_count
        )
        
    async def _process_single_message(
        self,
        queue_name: str,
        message: PGMQMessage,
        handler: Any
    ):
        """
        Process a single message.
        
        Args:
            queue_name: Queue name
            message: Message to process
            handler: Handler for this message type
        """
        start_time = datetime.utcnow()
        
        try:
            # Log processing start
            logger.info(
                f"Processing message from {queue_name}",
                msg_id=message.msg_id,
                job_type=message.message.get('job_type'),
                attempt=message.read_ct
            )
            
            # Process the message
            await handler.process(message)
            
            # Delete message on success
            await self.pgmq.delete(queue_name, message.msg_id)
            
            # Log success
            duration = (datetime.utcnow() - start_time).total_seconds()
            logger.info(
                f"Message processed successfully",
                queue=queue_name,
                msg_id=message.msg_id,
                duration_seconds=duration
            )
            
        except Exception as e:
            # Log error
            logger.error(
                f"Failed to process message",
                queue=queue_name,
                msg_id=message.msg_id,
                error=str(e),
                attempt=message.read_ct
            )
            
            # Check if we should retry or archive
            if message.read_ct >= settings.pgmq_max_retries:
                # Archive poison message
                await self.pgmq.archive(queue_name, message.msg_id)
                logger.warning(
                    f"Message archived after max retries",
                    queue=queue_name,
                    msg_id=message.msg_id,
                    attempts=message.read_ct
                )
            else:
                # Message will be retried automatically after visibility timeout
                logger.info(
                    f"Message will be retried",
                    queue=queue_name,
                    msg_id=message.msg_id,
                    attempt=message.read_ct
                )
                
            raise