"""
Intelligent batch processing service for AI requests.
Optimizes throughput, cost, and latency through smart batching strategies.
"""

from typing import Dict, List, Optional, Any, AsyncIterator, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import json
import time
from datetime import datetime, timedelta
from collections import defaultdict, deque
import heapq

from core.logging import get_logger

logger = get_logger(__name__)


class BatchStrategy(Enum):
    """Batching strategies"""
    IMMEDIATE = "immediate"      # No batching, process immediately
    TIME_BASED = "time_based"    # Batch by time window
    SIZE_BASED = "size_based"    # Batch by request count
    COST_OPTIMIZED = "cost_optimized"  # Optimize for cost efficiency
    HYBRID = "hybrid"            # Combine multiple strategies


class Priority(Enum):
    """Request priority levels"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4


@dataclass
class BatchRequest:
    """Individual request in a batch"""
    id: str
    request_type: str  # 'completion', 'embedding', 'generation'
    data: Dict[str, Any]
    priority: Priority
    user_id: str
    created_at: datetime
    deadline: Optional[datetime] = None
    callback: Optional[Callable] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BatchResult:
    """Result of a batch request"""
    request_id: str
    success: bool
    result: Any = None
    error: Optional[str] = None
    processing_time: float = 0.0
    tokens_used: int = 0
    cost_estimate: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BatchConfig:
    """Configuration for batch processing"""
    strategy: BatchStrategy = BatchStrategy.HYBRID
    max_batch_size: int = 10
    max_wait_time: float = 5.0  # seconds
    min_batch_size: int = 2
    priority_boost_factor: float = 2.0
    cost_threshold: float = 0.01  # dollars
    enable_dynamic_batching: bool = True
    max_concurrent_batches: int = 3


class BatchProcessor:
    """
    Intelligent batch processor for AI requests.
    Handles multiple batching strategies and optimization techniques.
    """
    
    def __init__(
        self,
        ai_manager,
        config: BatchConfig = None
    ):
        self.ai_manager = ai_manager
        self.config = config or BatchConfig()
        
        # Request queues by type and priority
        self.queues: Dict[str, Dict[Priority, deque]] = defaultdict(
            lambda: defaultdict(deque)
        )
        
        # Active batches
        self.active_batches: Dict[str, asyncio.Task] = {}
        
        # Statistics
        self.stats = {
            "total_requests": 0,
            "total_batches": 0,
            "avg_batch_size": 0.0,
            "total_processing_time": 0.0,
            "cost_savings": 0.0,
            "priority_distribution": defaultdict(int)
        }
        
        # Processing loop
        self._running = False
        self._processor_task = None
        
        # Locks
        self._queue_lock = asyncio.Lock()
        self._batch_lock = asyncio.Lock()
    
    async def start(self):
        """Start the batch processor"""
        if self._running:
            return
        
        self._running = True
        self._processor_task = asyncio.create_task(self._processing_loop())
        logger.info("Batch processor started")
    
    async def stop(self):
        """Stop the batch processor"""
        if not self._running:
            return
        
        self._running = False
        
        if self._processor_task:
            self._processor_task.cancel()
            try:
                await self._processor_task
            except asyncio.CancelledError:
                pass
        
        # Wait for active batches to complete
        if self.active_batches:
            await asyncio.gather(*self.active_batches.values(), return_exceptions=True)
        
        logger.info("Batch processor stopped")
    
    async def submit_request(
        self,
        request: BatchRequest,
        wait_for_result: bool = True
    ) -> Union[BatchResult, str]:
        """
        Submit a request for batch processing.
        
        Args:
            request: The batch request
            wait_for_result: Whether to wait for the result
            
        Returns:
            BatchResult if wait_for_result=True, else request_id
        """
        async with self._queue_lock:
            self.queues[request.request_type][request.priority].append(request)
            self.stats["total_requests"] += 1
            self.stats["priority_distribution"][request.priority] += 1
        
        if wait_for_result:
            # Create a future to wait for the result
            future = asyncio.Future()
            request.callback = lambda result: future.set_result(result)
            
            try:
                return await asyncio.wait_for(future, timeout=30.0)
            except asyncio.TimeoutError:
                return BatchResult(
                    request_id=request.id,
                    success=False,
                    error="Request timed out"
                )
        
        return request.id
    
    async def _processing_loop(self):
        """Main processing loop"""
        while self._running:
            try:
                # Check if we should create new batches
                await self._check_and_create_batches()
                
                # Clean up completed batches
                await self._cleanup_completed_batches()
                
                # Wait before next iteration
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Error in processing loop: {e}")
                await asyncio.sleep(1.0)
    
    async def _check_and_create_batches(self):
        """Check queues and create batches as needed"""
        async with self._queue_lock:
            for request_type, priority_queues in self.queues.items():
                for priority, queue in priority_queues.items():
                    if not queue:
                        continue
                    
                    # Check if we should create a batch
                    should_batch = await self._should_create_batch(
                        request_type, priority, queue
                    )
                    
                    if should_batch:
                        batch_requests = await self._extract_batch_requests(
                            request_type, priority, queue
                        )
                        
                        if batch_requests:
                            await self._create_batch(request_type, batch_requests)
    
    async def _should_create_batch(
        self,
        request_type: str,
        priority: Priority,
        queue: deque
    ) -> bool:
        """Determine if we should create a batch"""
        if not queue:
            return False
        
        # Check concurrent batch limit
        if len(self.active_batches) >= self.config.max_concurrent_batches:
            return False
        
        batch_size = len(queue)
        oldest_request = queue[0] if queue else None
        
        if not oldest_request:
            return False
        
        current_time = datetime.now()
        wait_time = (current_time - oldest_request.created_at).total_seconds()
        
        # Strategy-based decisions
        if self.config.strategy == BatchStrategy.IMMEDIATE:
            return batch_size > 0
        
        elif self.config.strategy == BatchStrategy.SIZE_BASED:
            return batch_size >= self.config.max_batch_size
        
        elif self.config.strategy == BatchStrategy.TIME_BASED:
            return wait_time >= self.config.max_wait_time
        
        elif self.config.strategy == BatchStrategy.COST_OPTIMIZED:
            estimated_cost = await self._estimate_batch_cost(queue)
            return estimated_cost >= self.config.cost_threshold
        
        elif self.config.strategy == BatchStrategy.HYBRID:
            # Hybrid strategy combines multiple factors
            
            # Priority boost
            priority_factor = priority.value * self.config.priority_boost_factor
            
            # Size factor
            size_factor = min(batch_size / self.config.max_batch_size, 1.0)
            
            # Time factor
            time_factor = min(wait_time / self.config.max_wait_time, 1.0)
            
            # Deadline urgency
            urgency_factor = 0.0
            if oldest_request.deadline:
                time_to_deadline = (oldest_request.deadline - current_time).total_seconds()
                if time_to_deadline > 0:
                    urgency_factor = max(0, 1.0 - (time_to_deadline / 60.0))  # 1 minute urgency window
            
            # Combined decision score
            decision_score = (
                priority_factor * 0.3 +
                size_factor * 0.3 +
                time_factor * 0.3 +
                urgency_factor * 0.1
            )
            
            return decision_score >= 1.0
        
        return False
    
    async def _extract_batch_requests(
        self,
        request_type: str,
        priority: Priority,
        queue: deque
    ) -> List[BatchRequest]:
        """Extract requests for a batch"""
        batch_requests = []
        max_size = self.config.max_batch_size
        
        # Extract up to max_batch_size requests
        while queue and len(batch_requests) < max_size:
            batch_requests.append(queue.popleft())
        
        return batch_requests
    
    async def _create_batch(
        self,
        request_type: str,
        requests: List[BatchRequest]
    ):
        """Create and start processing a batch"""
        batch_id = f"{request_type}_{int(time.time())}_{len(self.active_batches)}"
        
        # Create batch processing task
        batch_task = asyncio.create_task(
            self._process_batch(batch_id, request_type, requests)
        )
        
        async with self._batch_lock:
            self.active_batches[batch_id] = batch_task
        
        logger.info(f"Created batch {batch_id} with {len(requests)} requests")
    
    async def _process_batch(
        self,
        batch_id: str,
        request_type: str,
        requests: List[BatchRequest]
    ):
        """Process a batch of requests"""
        start_time = time.time()
        results = []
        
        try:
            logger.info(f"Processing batch {batch_id} with {len(requests)} requests")
            
            if request_type == "completion":
                results = await self._process_completion_batch(requests)
            elif request_type == "embedding":
                results = await self._process_embedding_batch(requests)
            elif request_type == "generation":
                results = await self._process_generation_batch(requests)
            else:
                # Fallback to individual processing
                results = await self._process_individual_requests(requests)
            
            processing_time = time.time() - start_time
            
            # Update statistics
            self.stats["total_batches"] += 1
            self.stats["avg_batch_size"] = (
                (self.stats["avg_batch_size"] * (self.stats["total_batches"] - 1) + len(requests))
                / self.stats["total_batches"]
            )
            self.stats["total_processing_time"] += processing_time
            
            logger.info(f"Batch {batch_id} completed in {processing_time:.2f}s")
            
        except Exception as e:
            logger.error(f"Error processing batch {batch_id}: {e}")
            
            # Create error results for all requests
            results = [
                BatchResult(
                    request_id=req.id,
                    success=False,
                    error=str(e),
                    processing_time=time.time() - start_time
                )
                for req in requests
            ]
        
        # Notify callbacks
        for result in results:
            request = next((r for r in requests if r.id == result.request_id), None)
            if request and request.callback:
                try:
                    request.callback(result)
                except Exception as e:
                    logger.error(f"Error in callback for request {result.request_id}: {e}")
    
    async def _process_completion_batch(
        self,
        requests: List[BatchRequest]
    ) -> List[BatchResult]:
        """Process a batch of completion requests"""
        results = []
        
        # Group requests by model for efficiency
        model_groups = defaultdict(list)
        for req in requests:
            model = req.data.get('model', 'default')
            model_groups[model].append(req)
        
        # Process each model group
        for model, model_requests in model_groups.items():
            model_results = await self._process_model_group(model_requests, "completion")
            results.extend(model_results)
        
        return results
    
    async def _process_embedding_batch(
        self,
        requests: List[BatchRequest]
    ) -> List[BatchResult]:
        """Process a batch of embedding requests"""
        results = []
        
        # Combine texts for batch embedding
        texts = []
        request_mapping = []
        
        for req in requests:
            req_texts = req.data.get('texts', [])
            if isinstance(req_texts, str):
                req_texts = [req_texts]
            
            start_idx = len(texts)
            texts.extend(req_texts)
            end_idx = len(texts)
            
            request_mapping.append({
                'request': req,
                'start_idx': start_idx,
                'end_idx': end_idx,
                'count': len(req_texts)
            })
        
        if texts:
            try:
                # Process batch embedding
                from services.ai.providers.base import AIModel, EmbeddingOptions
                
                model = AIModel.EMBEDDING_3_SMALL  # Default embedding model
                options = EmbeddingOptions()
                
                embedding_response = await self.ai_manager.embed(
                    texts=texts,
                    model=model,
                    options=options
                )
                
                # Split results back to individual requests
                for mapping in request_mapping:
                    req_embeddings = embedding_response.embeddings[
                        mapping['start_idx']:mapping['end_idx']
                    ]
                    
                    result = BatchResult(
                        request_id=mapping['request'].id,
                        success=True,
                        result={
                            'embeddings': req_embeddings,
                            'model': embedding_response.model
                        },
                        tokens_used=mapping['count'] * 10,  # Estimate
                        cost_estimate=mapping['count'] * 0.0001  # Estimate
                    )
                    results.append(result)
                    
            except Exception as e:
                # Create error results
                for mapping in request_mapping:
                    result = BatchResult(
                        request_id=mapping['request'].id,
                        success=False,
                        error=str(e)
                    )
                    results.append(result)
        
        return results
    
    async def _process_generation_batch(
        self,
        requests: List[BatchRequest]
    ) -> List[BatchResult]:
        """Process a batch of content generation requests"""
        # For generation requests, we'll process them individually
        # as they often have different personas and requirements
        return await self._process_individual_requests(requests)
    
    async def _process_individual_requests(
        self,
        requests: List[BatchRequest]
    ) -> List[BatchResult]:
        """Process requests individually (fallback)"""
        tasks = []
        
        for req in requests:
            task = asyncio.create_task(self._process_single_request(req))
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Convert exceptions to error results
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append(
                    BatchResult(
                        request_id=requests[i].id,
                        success=False,
                        error=str(result)
                    )
                )
            else:
                processed_results.append(result)
        
        return processed_results
    
    async def _process_single_request(self, request: BatchRequest) -> BatchResult:
        """Process a single request"""
        start_time = time.time()
        
        try:
            # Route to appropriate handler based on request type
            if request.request_type == "completion":
                result = await self._handle_completion_request(request)
            elif request.request_type == "embedding":
                result = await self._handle_embedding_request(request)
            elif request.request_type == "generation":
                result = await self._handle_generation_request(request)
            else:
                raise ValueError(f"Unknown request type: {request.request_type}")
            
            return BatchResult(
                request_id=request.id,
                success=True,
                result=result,
                processing_time=time.time() - start_time
            )
            
        except Exception as e:
            return BatchResult(
                request_id=request.id,
                success=False,
                error=str(e),
                processing_time=time.time() - start_time
            )
    
    async def _handle_completion_request(self, request: BatchRequest) -> Any:
        """Handle a completion request"""
        from services.ai.providers.base import AIModel, Message, CompletionOptions
        
        data = request.data
        messages = [Message(**msg) for msg in data.get('messages', [])]
        model = AIModel(data.get('model', 'gpt-4-turbo'))
        options = CompletionOptions(**data.get('options', {}))
        
        return await self.ai_manager.complete(
            messages=messages,
            model=model,
            options=options,
            user_id=request.user_id
        )
    
    async def _handle_embedding_request(self, request: BatchRequest) -> Any:
        """Handle an embedding request"""
        from services.ai.providers.base import AIModel, EmbeddingOptions
        
        data = request.data
        texts = data.get('texts', [])
        model = AIModel(data.get('model', 'text-embedding-3-small'))
        options = EmbeddingOptions(**data.get('options', {}))
        
        return await self.ai_manager.embed(
            texts=texts,
            model=model,
            options=options,
            user_id=request.user_id
        )
    
    async def _handle_generation_request(self, request: BatchRequest) -> Any:
        """Handle a content generation request"""
        # This would integrate with the content generation services
        data = request.data
        content_type = data.get('content_type', 'explanation')
        
        # Placeholder implementation
        return {
            'content': f"Generated {content_type} content",
            'model': 'gpt-4-turbo',
            'tokens': 100
        }
    
    async def _process_model_group(
        self,
        requests: List[BatchRequest],
        request_type: str
    ) -> List[BatchResult]:
        """Process a group of requests for the same model"""
        # For now, process individually
        # In the future, this could implement model-specific optimizations
        return await self._process_individual_requests(requests)
    
    async def _estimate_batch_cost(self, queue: deque) -> float:
        """Estimate the cost of processing the current queue as a batch"""
        # Simple estimation based on token counts
        total_cost = 0.0
        
        for request in queue:
            # Estimate tokens (simplified)
            data = request.data
            if 'messages' in data:
                # Completion request
                text_content = ' '.join(msg.get('content', '') for msg in data['messages'])
                tokens = len(text_content.split()) * 1.3  # Rough estimate
                total_cost += tokens * 0.00002  # $0.02 per 1K tokens estimate
            elif 'texts' in data:
                # Embedding request
                texts = data['texts']
                if isinstance(texts, str):
                    texts = [texts]
                tokens = sum(len(text.split()) * 1.3 for text in texts)
                total_cost += tokens * 0.0000001  # Much cheaper for embeddings
        
        return total_cost
    
    async def _cleanup_completed_batches(self):
        """Remove completed batch tasks"""
        async with self._batch_lock:
            completed = []
            
            for batch_id, task in self.active_batches.items():
                if task.done():
                    completed.append(batch_id)
            
            for batch_id in completed:
                del self.active_batches[batch_id]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get batch processing statistics"""
        queue_stats = {}
        total_queued = 0
        
        for request_type, priority_queues in self.queues.items():
            type_stats = {}
            for priority, queue in priority_queues.items():
                queue_size = len(queue)
                type_stats[priority.name.lower()] = queue_size
                total_queued += queue_size
            queue_stats[request_type] = type_stats
        
        return {
            **self.stats,
            "active_batches": len(self.active_batches),
            "total_queued": total_queued,
            "queue_stats": queue_stats,
            "config": {
                "strategy": self.config.strategy.value,
                "max_batch_size": self.config.max_batch_size,
                "max_wait_time": self.config.max_wait_time,
                "max_concurrent_batches": self.config.max_concurrent_batches
            }
        }


# Factory function
def create_batch_processor(
    ai_manager,
    config: Optional[Dict[str, Any]] = None
) -> BatchProcessor:
    """Create a batch processor with the given configuration"""
    
    if config:
        batch_config = BatchConfig(
            strategy=BatchStrategy(config.get('strategy', 'hybrid')),
            max_batch_size=config.get('max_batch_size', 10),
            max_wait_time=config.get('max_wait_time', 5.0),
            min_batch_size=config.get('min_batch_size', 2),
            priority_boost_factor=config.get('priority_boost_factor', 2.0),
            cost_threshold=config.get('cost_threshold', 0.01),
            enable_dynamic_batching=config.get('enable_dynamic_batching', True),
            max_concurrent_batches=config.get('max_concurrent_batches', 3)
        )
    else:
        batch_config = BatchConfig()
    
    return BatchProcessor(ai_manager, batch_config)