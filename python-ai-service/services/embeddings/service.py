"""
Advanced embeddings service for document processing and vector search.
Handles batch processing, caching, and optimization.
"""

from typing import Dict, List, Optional, Union, Any, Tuple
from dataclasses import dataclass
import asyncio
import hashlib
import json
from datetime import datetime, timedelta
import numpy as np

from structlog import get_logger

from services.ai.manager import AIManager  
from services.ai.providers.base import AIModel, EmbeddingOptions
from services.cache.vector_cache import VectorCache

logger = get_logger()


@dataclass
class EmbeddingItem:
    """Single embedding item"""
    id: str
    text: str
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None
    created_at: Optional[datetime] = None


@dataclass
class BatchEmbeddingResult:
    """Result of batch embedding operation"""
    embeddings: List[EmbeddingItem]
    total_tokens: int
    processing_time: float
    model_used: str
    cache_hits: int
    cache_misses: int


class EmbeddingService:
    """Advanced embedding service with caching and batch optimization"""
    
    def __init__(
        self,
        ai_manager: AIManager,
        cache: Optional[VectorCache] = None,
        default_model: AIModel = AIModel.EMBEDDING_3_SMALL,
        batch_size: int = 50,
        max_concurrent: int = 3
    ):
        self.ai_manager = ai_manager
        self.cache = cache
        self.default_model = default_model
        self.batch_size = batch_size
        self.max_concurrent = max_concurrent
        
        # Performance tracking
        self.stats = {
            "total_requests": 0,
            "total_tokens": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "average_latency": 0.0,
            "models_used": {}
        }
    
    async def embed_single(
        self,
        text: str,
        model: Optional[AIModel] = None,
        options: Optional[EmbeddingOptions] = None,
        user_id: Optional[str] = None,
        use_cache: bool = True
    ) -> List[float]:
        """Generate embedding for single text"""
        model = model or self.default_model
        
        # Check cache first
        if use_cache and self.cache:
            cache_key = self._generate_cache_key(text, model, options)
            cached_embedding = await self.cache.get(cache_key)
            if cached_embedding:
                self.stats["cache_hits"] += 1
                return cached_embedding
        
        # Generate embedding
        start_time = datetime.now()
        response = await self.ai_manager.embed(
            texts=text,
            model=model,
            options=options,
            user_id=user_id
        )
        
        embedding = response.embeddings[0]
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Update stats
        self._update_stats(model, response.usage, processing_time, cache_hit=False)
        
        # Cache result
        if use_cache and self.cache:
            await self.cache.set(cache_key, embedding, ttl=3600)  # 1 hour TTL
        
        return embedding
    
    async def embed_batch(
        self,
        items: List[Union[str, EmbeddingItem]],
        model: Optional[AIModel] = None,
        options: Optional[EmbeddingOptions] = None,
        user_id: Optional[str] = None,
        use_cache: bool = True,
        deduplicate: bool = True
    ) -> BatchEmbeddingResult:
        """Generate embeddings for multiple texts with optimization"""
        start_time = datetime.now()
        model = model or self.default_model
        
        # Convert to EmbeddingItem objects
        embedding_items = self._prepare_items(items)
        
        # Deduplicate if requested
        if deduplicate:
            embedding_items = self._deduplicate_items(embedding_items)
        
        # Check cache for existing embeddings
        cache_hits = 0
        cache_misses = 0
        items_to_process = []
        
        if use_cache and self.cache:
            for item in embedding_items:
                cache_key = self._generate_cache_key(item.text, model, options)
                cached_embedding = await self.cache.get(cache_key)
                
                if cached_embedding:
                    item.embedding = cached_embedding
                    cache_hits += 1
                else:
                    items_to_process.append((item, cache_key))
                    cache_misses += 1
        else:
            items_to_process = [(item, None) for item in embedding_items]
            cache_misses = len(embedding_items)
        
        # Process remaining items in batches
        total_tokens = 0
        if items_to_process:
            total_tokens = await self._process_batches(
                items_to_process, model, options, user_id, use_cache
            )
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return BatchEmbeddingResult(
            embeddings=embedding_items,
            total_tokens=total_tokens,
            processing_time=processing_time,
            model_used=model.value,
            cache_hits=cache_hits,
            cache_misses=cache_misses
        )
    
    async def embed_documents(
        self,
        documents: List[Dict[str, Any]],
        text_field: str = "content",
        model: Optional[AIModel] = None,
        chunk_size: int = 1000,
        overlap: int = 100,
        user_id: Optional[str] = None
    ) -> List[EmbeddingItem]:
        """Embed documents with chunking support"""
        model = model or self.default_model
        
        # Chunk documents
        all_chunks = []
        for doc in documents:
            chunks = self._chunk_document(
                doc, text_field, chunk_size, overlap
            )
            all_chunks.extend(chunks)
        
        # Generate embeddings for all chunks
        result = await self.embed_batch(
            all_chunks, model=model, user_id=user_id
        )
        
        return result.embeddings
    
    async def find_similar(
        self,
        query_text: str,
        candidate_embeddings: List[Tuple[str, List[float]]],
        top_k: int = 10,
        threshold: float = 0.0,
        model: Optional[AIModel] = None,
        user_id: Optional[str] = None
    ) -> List[Tuple[str, float]]:
        """Find most similar embeddings to query"""
        # Generate query embedding
        query_embedding = await self.embed_single(
            query_text, model=model, user_id=user_id
        )
        
        # Calculate similarities
        similarities = []
        for item_id, embedding in candidate_embeddings:
            similarity = self._cosine_similarity(query_embedding, embedding)
            if similarity >= threshold:
                similarities.append((item_id, similarity))
        
        # Sort by similarity and return top k
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]
    
    def _prepare_items(
        self, items: List[Union[str, EmbeddingItem]]
    ) -> List[EmbeddingItem]:
        """Convert input items to EmbeddingItem objects"""
        prepared_items = []
        
        for i, item in enumerate(items):
            if isinstance(item, str):
                embedding_item = EmbeddingItem(
                    id=f"item_{i}",
                    text=item,
                    metadata={}
                )
            else:
                embedding_item = item
            
            prepared_items.append(embedding_item)
        
        return prepared_items
    
    def _deduplicate_items(
        self, items: List[EmbeddingItem]
    ) -> List[EmbeddingItem]:
        """Remove duplicate texts, keeping first occurrence"""
        seen_texts = set()
        deduplicated = []
        
        for item in items:
            text_hash = hashlib.md5(item.text.encode()).hexdigest()
            if text_hash not in seen_texts:
                seen_texts.add(text_hash)
                deduplicated.append(item)
        
        return deduplicated
    
    async def _process_batches(
        self,
        items_with_keys: List[Tuple[EmbeddingItem, Optional[str]]],
        model: AIModel,
        options: Optional[EmbeddingOptions],
        user_id: Optional[str],
        use_cache: bool
    ) -> int:
        """Process items in batches with concurrency control"""
        total_tokens = 0
        semaphore = asyncio.Semaphore(self.max_concurrent)
        
        # Create batches
        batches = [
            items_with_keys[i:i + self.batch_size]
            for i in range(0, len(items_with_keys), self.batch_size)
        ]
        
        # Process batches concurrently
        async def process_batch(batch):
            async with semaphore:
                return await self._process_single_batch(
                    batch, model, options, user_id, use_cache
                )
        
        batch_results = await asyncio.gather(
            *[process_batch(batch) for batch in batches]
        )
        
        return sum(batch_results)
    
    async def _process_single_batch(
        self,
        batch: List[Tuple[EmbeddingItem, Optional[str]]],
        model: AIModel,
        options: Optional[EmbeddingOptions],
        user_id: Optional[str],
        use_cache: bool
    ) -> int:
        """Process a single batch of embeddings"""
        texts = [item.text for item, _ in batch]
        
        response = await self.ai_manager.embed(
            texts=texts,
            model=model,
            options=options,
            user_id=user_id
        )
        
        # Assign embeddings and cache
        for i, (item, cache_key) in enumerate(batch):
            item.embedding = response.embeddings[i]
            item.created_at = datetime.now()
            
            # Cache if enabled
            if use_cache and cache_key and self.cache:
                await self.cache.set(cache_key, item.embedding, ttl=3600)
        
        return response.usage.get("total_tokens", 0)
    
    def _chunk_document(
        self,
        document: Dict[str, Any],
        text_field: str,
        chunk_size: int,
        overlap: int
    ) -> List[EmbeddingItem]:
        """Chunk a document into smaller pieces"""
        text = document.get(text_field, "")
        doc_id = document.get("id", "unknown")
        
        chunks = []
        words = text.split()
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk_words = words[i:i + chunk_size]
            chunk_text = " ".join(chunk_words)
            
            chunk = EmbeddingItem(
                id=f"{doc_id}_chunk_{i}",
                text=chunk_text,
                metadata={
                    **document.get("metadata", {}),
                    "document_id": doc_id,
                    "chunk_index": i // (chunk_size - overlap),
                    "chunk_start": i,
                    "chunk_end": i + len(chunk_words)
                }
            )
            chunks.append(chunk)
        
        return chunks
    
    def _generate_cache_key(
        self,
        text: str,
        model: AIModel,
        options: Optional[EmbeddingOptions]
    ) -> str:
        """Generate cache key for embedding"""
        key_parts = [
            text,
            model.value,
            str(options.dimensions if options and options.dimensions else "default")
        ]
        
        key_string = "|".join(key_parts)
        return hashlib.sha256(key_string.encode()).hexdigest()
    
    def _cosine_similarity(
        self, a: List[float], b: List[float]
    ) -> float:
        """Calculate cosine similarity between two vectors"""
        a_np = np.array(a)
        b_np = np.array(b)
        
        dot_product = np.dot(a_np, b_np)
        norm_a = np.linalg.norm(a_np)
        norm_b = np.linalg.norm(b_np)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
        
        return dot_product / (norm_a * norm_b)
    
    def _update_stats(
        self,
        model: AIModel,
        usage: Dict[str, int],
        processing_time: float,
        cache_hit: bool
    ) -> None:
        """Update performance statistics"""
        self.stats["total_requests"] += 1
        
        if not cache_hit:
            self.stats["cache_misses"] += 1
            self.stats["total_tokens"] += usage.get("total_tokens", 0)
            
            # Update average latency
            total_latency = (
                self.stats["average_latency"] * (self.stats["total_requests"] - 1) + 
                processing_time
            )
            self.stats["average_latency"] = total_latency / self.stats["total_requests"]
            
            # Update model usage
            model_name = model.value
            if model_name not in self.stats["models_used"]:
                self.stats["models_used"][model_name] = 0
            self.stats["models_used"][model_name] += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Get service statistics"""
        cache_rate = 0.0
        if self.stats["total_requests"] > 0:
            cache_rate = self.stats["cache_hits"] / self.stats["total_requests"]
        
        return {
            **self.stats,
            "cache_hit_rate": cache_rate,
            "default_model": self.default_model.value,
            "batch_size": self.batch_size,
            "max_concurrent": self.max_concurrent
        }
    
    async def clear_cache(self) -> None:
        """Clear embedding cache"""
        if self.cache:
            await self.cache.clear()
    
    async def close(self) -> None:
        """Clean up resources"""
        if self.cache:
            await self.cache.close()