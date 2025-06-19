"""
Vector cache implementation for embedding storage and retrieval.
Supports both in-memory and Redis-backed caching.
"""

from typing import List, Optional, Dict, Any
from abc import ABC, abstractmethod
import json
import pickle
import asyncio
from datetime import datetime, timedelta

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from structlog import get_logger

logger = get_logger()


class VectorCache(ABC):
    """Abstract base class for vector caching"""
    
    @abstractmethod
    async def get(self, key: str) -> Optional[List[float]]:
        """Get embedding from cache"""
        pass
    
    @abstractmethod
    async def set(
        self, 
        key: str, 
        embedding: List[float], 
        ttl: Optional[int] = None
    ) -> None:
        """Store embedding in cache"""
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete embedding from cache"""
        pass
    
    @abstractmethod
    async def clear(self) -> None:
        """Clear all cached embeddings"""
        pass
    
    @abstractmethod
    async def close(self) -> None:
        """Close cache connection"""
        pass


class MemoryVectorCache(VectorCache):
    """In-memory vector cache implementation"""
    
    def __init__(self, max_size: int = 10000, default_ttl: int = 3600):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[List[float]]:
        """Get embedding from memory cache"""
        async with self._lock:
            if key not in self.cache:
                return None
            
            entry = self.cache[key]
            
            # Check if expired
            if entry["expires_at"] and datetime.now() > entry["expires_at"]:
                del self.cache[key]
                return None
            
            return entry["embedding"]
    
    async def set(
        self, 
        key: str, 
        embedding: List[float], 
        ttl: Optional[int] = None
    ) -> None:
        """Store embedding in memory cache"""
        async with self._lock:
            # Implement LRU eviction if at capacity
            if len(self.cache) >= self.max_size and key not in self.cache:
                await self._evict_lru()
            
            expires_at = None
            if ttl or self.default_ttl:
                ttl_seconds = ttl or self.default_ttl
                expires_at = datetime.now() + timedelta(seconds=ttl_seconds)
            
            self.cache[key] = {
                "embedding": embedding,
                "created_at": datetime.now(),
                "expires_at": expires_at,
                "access_count": 0
            }
    
    async def delete(self, key: str) -> None:
        """Delete embedding from memory cache"""
        async with self._lock:
            self.cache.pop(key, None)
    
    async def clear(self) -> None:
        """Clear all cached embeddings"""
        async with self._lock:
            self.cache.clear()
    
    async def close(self) -> None:
        """Close cache (no-op for memory cache)"""
        await self.clear()
    
    async def _evict_lru(self) -> None:
        """Evict least recently used entry"""
        if not self.cache:
            return
        
        # Find entry with oldest created_at
        oldest_key = min(
            self.cache.keys(),
            key=lambda k: self.cache[k]["created_at"]
        )
        del self.cache[oldest_key]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_entries = len(self.cache)
        expired_entries = sum(
            1 for entry in self.cache.values()
            if entry["expires_at"] and datetime.now() > entry["expires_at"]
        )
        
        return {
            "type": "memory",
            "total_entries": total_entries,
            "expired_entries": expired_entries,
            "max_size": self.max_size,
            "size_ratio": total_entries / self.max_size if self.max_size > 0 else 0
        }


class RedisVectorCache(VectorCache):
    """Redis-backed vector cache implementation"""
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        key_prefix: str = "embedding:",
        default_ttl: int = 3600,
        compress: bool = True
    ):
        if not REDIS_AVAILABLE:
            raise ImportError("redis not available. Install with: pip install redis")
        
        self.redis_url = redis_url
        self.key_prefix = key_prefix
        self.default_ttl = default_ttl
        self.compress = compress
        self.redis_client: Optional[redis.Redis] = None
    
    async def _get_client(self) -> redis.Redis:
        """Get or create Redis client"""
        if not self.redis_client:
            self.redis_client = redis.from_url(self.redis_url)
        return self.redis_client
    
    def _make_key(self, key: str) -> str:
        """Create Redis key with prefix"""
        return f"{self.key_prefix}{key}"
    
    async def get(self, key: str) -> Optional[List[float]]:
        """Get embedding from Redis cache"""
        try:
            client = await self._get_client()
            redis_key = self._make_key(key)
            
            data = await client.get(redis_key)
            if not data:
                return None
            
            if self.compress:
                # Decompress pickled data
                embedding = pickle.loads(data)
            else:
                # JSON decode
                embedding = json.loads(data.decode())
            
            return embedding
            
        except Exception as e:
            logger.error(f"Redis cache get error: {e}")
            return None
    
    async def set(
        self, 
        key: str, 
        embedding: List[float], 
        ttl: Optional[int] = None
    ) -> None:
        """Store embedding in Redis cache"""
        try:
            client = await self._get_client()
            redis_key = self._make_key(key)
            
            if self.compress:
                # Pickle and compress
                data = pickle.dumps(embedding)
            else:
                # JSON encode
                data = json.dumps(embedding)
            
            ttl_seconds = ttl or self.default_ttl
            await client.setex(redis_key, ttl_seconds, data)
            
        except Exception as e:
            logger.error(f"Redis cache set error: {e}")
    
    async def delete(self, key: str) -> None:
        """Delete embedding from Redis cache"""
        try:
            client = await self._get_client()
            redis_key = self._make_key(key)
            await client.delete(redis_key)
            
        except Exception as e:
            logger.error(f"Redis cache delete error: {e}")
    
    async def clear(self) -> None:
        """Clear all cached embeddings with prefix"""
        try:
            client = await self._get_client()
            pattern = f"{self.key_prefix}*"
            
            # Use scan to avoid blocking on large datasets
            async for key in client.scan_iter(pattern):
                await client.delete(key)
                
        except Exception as e:
            logger.error(f"Redis cache clear error: {e}")
    
    async def close(self) -> None:
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            self.redis_client = None
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            client = await self._get_client()
            info = await client.info()
            
            # Count keys with our prefix
            pattern = f"{self.key_prefix}*"
            key_count = 0
            async for _ in client.scan_iter(pattern):
                key_count += 1
            
            return {
                "type": "redis",
                "total_entries": key_count,
                "redis_memory_used": info.get("used_memory_human", "unknown"),
                "redis_connected_clients": info.get("connected_clients", 0),
                "key_prefix": self.key_prefix,
                "compress": self.compress
            }
            
        except Exception as e:
            logger.error(f"Redis stats error: {e}")
            return {"type": "redis", "error": str(e)}


def create_vector_cache(
    cache_type: str = "memory",
    cache_config: Optional[Dict[str, Any]] = None
) -> VectorCache:
    """Factory function to create vector cache"""
    cache_config = cache_config or {}
    
    if cache_type == "memory":
        return MemoryVectorCache(
            max_size=cache_config.get("max_size", 10000),
            default_ttl=cache_config.get("default_ttl", 3600)
        )
    
    elif cache_type == "redis":
        return RedisVectorCache(
            redis_url=cache_config.get("redis_url", "redis://localhost:6379"),
            key_prefix=cache_config.get("key_prefix", "embedding:"),
            default_ttl=cache_config.get("default_ttl", 3600),
            compress=cache_config.get("compress", True)
        )
    
    else:
        raise ValueError(f"Unknown cache type: {cache_type}")


class HybridVectorCache(VectorCache):
    """Hybrid cache with L1 (memory) and L2 (Redis) tiers"""
    
    def __init__(
        self,
        l1_cache: VectorCache,
        l2_cache: VectorCache,
        l1_ttl: int = 300,  # 5 minutes
        l2_ttl: int = 3600  # 1 hour
    ):
        self.l1_cache = l1_cache
        self.l2_cache = l2_cache
        self.l1_ttl = l1_ttl
        self.l2_ttl = l2_ttl
    
    async def get(self, key: str) -> Optional[List[float]]:
        """Get from L1 first, fallback to L2"""
        # Try L1 cache first
        embedding = await self.l1_cache.get(key)
        if embedding:
            return embedding
        
        # Try L2 cache
        embedding = await self.l2_cache.get(key)
        if embedding:
            # Promote to L1 cache
            await self.l1_cache.set(key, embedding, self.l1_ttl)
            return embedding
        
        return None
    
    async def set(
        self, 
        key: str, 
        embedding: List[float], 
        ttl: Optional[int] = None
    ) -> None:
        """Store in both L1 and L2 caches"""
        await asyncio.gather(
            self.l1_cache.set(key, embedding, self.l1_ttl),
            self.l2_cache.set(key, embedding, ttl or self.l2_ttl)
        )
    
    async def delete(self, key: str) -> None:
        """Delete from both caches"""
        await asyncio.gather(
            self.l1_cache.delete(key),
            self.l2_cache.delete(key)
        )
    
    async def clear(self) -> None:
        """Clear both caches"""
        await asyncio.gather(
            self.l1_cache.clear(),
            self.l2_cache.clear()
        )
    
    async def close(self) -> None:
        """Close both caches"""
        await asyncio.gather(
            self.l1_cache.close(),
            self.l2_cache.close()
        )