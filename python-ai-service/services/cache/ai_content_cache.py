"""
AI Content Cache for caching generated content, prompts, and responses.
Supports intelligent cache key generation based on content and persona.
"""

from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass
from abc import ABC, abstractmethod
import json
import hashlib
from datetime import datetime, timedelta
import asyncio

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class CacheEntry:
    """Cache entry with metadata"""
    content: str
    content_type: str
    model_used: str
    created_at: datetime
    usage_tokens: int
    cost_estimate: float
    persona_hash: Optional[str] = None
    quality_score: Optional[float] = None


class ContentCacheKeyGenerator:
    """Generates consistent cache keys for AI content"""
    
    def __init__(self):
        self.hash_algorithm = 'sha256'
    
    def generate_key(
        self,
        content_type: str,
        source_content: str,
        persona: Optional[Dict[str, Any]] = None,
        additional_params: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a consistent cache key for content requests.
        
        Args:
            content_type: Type of content (quiz, summary, etc.)
            source_content: Original source content
            persona: User persona for personalization
            additional_params: Additional parameters affecting output
            
        Returns:
            Hex string cache key
        """
        # Create components for key generation
        key_components = {
            'content_type': content_type,
            'source_hash': self._hash_text(source_content),
            'persona_hash': self._hash_persona(persona) if persona else None,
            'params_hash': self._hash_params(additional_params) if additional_params else None
        }
        
        # Remove None values
        key_components = {k: v for k, v in key_components.items() if v is not None}
        
        # Create deterministic string
        key_string = json.dumps(key_components, sort_keys=True)
        
        # Generate hash
        return self._hash_text(key_string)
    
    def _hash_text(self, text: str) -> str:
        """Hash text content"""
        hasher = hashlib.new(self.hash_algorithm)
        hasher.update(text.encode('utf-8'))
        return hasher.hexdigest()[:16]  # 16 chars for reasonable key length
    
    def _hash_persona(self, persona: Dict[str, Any]) -> str:
        """Hash persona for cache key"""
        # Extract relevant persona fields that affect content generation
        relevant_fields = {
            'professional_context': persona.get('professional_context', {}),
            'learning_style': persona.get('learning_style', {}),
            'content_preferences': persona.get('content_preferences', {}),
            'communication_tone': persona.get('communication_tone', {}),
            'personal_interests': persona.get('personal_interests', {})
        }
        
        # Create deterministic string
        persona_string = json.dumps(relevant_fields, sort_keys=True)
        return self._hash_text(persona_string)
    
    def _hash_params(self, params: Dict[str, Any]) -> str:
        """Hash additional parameters"""
        # Sort keys for consistency
        params_string = json.dumps(params, sort_keys=True)
        return self._hash_text(params_string)


class AIContentCache(ABC):
    """Abstract base class for AI content caching"""
    
    @abstractmethod
    async def get(self, key: str) -> Optional[CacheEntry]:
        """Get cached content"""
        pass
    
    @abstractmethod
    async def set(
        self,
        key: str,
        entry: CacheEntry,
        ttl: Optional[int] = None
    ) -> None:
        """Store content in cache"""
        pass
    
    @abstractmethod
    async def delete(self, key: str) -> None:
        """Delete cached content"""
        pass
    
    @abstractmethod
    async def invalidate_user(self, user_id: str) -> int:
        """Invalidate all cache entries for a user"""
        pass
    
    @abstractmethod
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        pass
    
    @abstractmethod
    async def close(self) -> None:
        """Close cache connection"""
        pass


class MemoryAIContentCache(AIContentCache):
    """In-memory AI content cache"""
    
    def __init__(
        self,
        max_size: int = 5000,
        default_ttl: int = 7200,  # 2 hours
        max_content_size: int = 50000  # 50KB max per entry
    ):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.user_keys: Dict[str, set] = {}  # Track keys by user
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.max_content_size = max_content_size
        self._lock = asyncio.Lock()
        self.key_generator = ContentCacheKeyGenerator()
        
        # Stats
        self.hits = 0
        self.misses = 0
        self.evictions = 0
    
    async def get(self, key: str) -> Optional[CacheEntry]:
        """Get cached content"""
        async with self._lock:
            if key not in self.cache:
                self.misses += 1
                return None
            
            entry_data = self.cache[key]
            
            # Check if expired
            if entry_data["expires_at"] and datetime.now() > entry_data["expires_at"]:
                await self._remove_entry(key)
                self.misses += 1
                return None
            
            # Update access time
            entry_data["last_accessed"] = datetime.now()
            entry_data["access_count"] += 1
            
            self.hits += 1
            return self._deserialize_entry(entry_data["entry"])
    
    async def set(
        self,
        key: str,
        entry: CacheEntry,
        ttl: Optional[int] = None
    ) -> None:
        """Store content in cache"""
        # Check content size
        if len(entry.content) > self.max_content_size:
            logger.warning(f"Content too large for cache: {len(entry.content)} bytes")
            return
        
        async with self._lock:
            # Evict if at capacity
            if len(self.cache) >= self.max_size and key not in self.cache:
                await self._evict_lru()
            
            expires_at = None
            if ttl or self.default_ttl:
                ttl_seconds = ttl or self.default_ttl
                expires_at = datetime.now() + timedelta(seconds=ttl_seconds)
            
            self.cache[key] = {
                "entry": self._serialize_entry(entry),
                "created_at": datetime.now(),
                "last_accessed": datetime.now(),
                "expires_at": expires_at,
                "access_count": 0,
                "size_bytes": len(entry.content)
            }
    
    async def delete(self, key: str) -> None:
        """Delete cached content"""
        async with self._lock:
            await self._remove_entry(key)
    
    async def invalidate_user(self, user_id: str) -> int:
        """Invalidate all cache entries for a user"""
        # For memory cache, we'd need to track user associations
        # This is a simplified implementation
        invalidated = 0
        async with self._lock:
            keys_to_remove = []
            for key in self.cache.keys():
                # In a real implementation, we'd track user associations
                # For now, this is a placeholder
                pass
        return invalidated
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_entries = len(self.cache)
        total_size = sum(entry["size_bytes"] for entry in self.cache.values())
        hit_rate = self.hits / (self.hits + self.misses) if (self.hits + self.misses) > 0 else 0
        
        expired_entries = sum(
            1 for entry in self.cache.values()
            if entry["expires_at"] and datetime.now() > entry["expires_at"]
        )
        
        return {
            "type": "memory",
            "total_entries": total_entries,
            "total_size_bytes": total_size,
            "expired_entries": expired_entries,
            "hit_rate": hit_rate,
            "hits": self.hits,
            "misses": self.misses,
            "evictions": self.evictions,
            "max_size": self.max_size,
            "utilization": total_entries / self.max_size if self.max_size > 0 else 0
        }
    
    async def close(self) -> None:
        """Close cache"""
        async with self._lock:
            self.cache.clear()
            self.user_keys.clear()
    
    async def _evict_lru(self) -> None:
        """Evict least recently used entry"""
        if not self.cache:
            return
        
        # Find LRU entry
        lru_key = min(
            self.cache.keys(),
            key=lambda k: self.cache[k]["last_accessed"]
        )
        
        await self._remove_entry(lru_key)
        self.evictions += 1
    
    async def _remove_entry(self, key: str) -> None:
        """Remove entry and update user tracking"""
        self.cache.pop(key, None)
    
    def _serialize_entry(self, entry: CacheEntry) -> Dict[str, Any]:
        """Serialize cache entry for storage"""
        return {
            "content": entry.content,
            "content_type": entry.content_type,
            "model_used": entry.model_used,
            "created_at": entry.created_at.isoformat(),
            "usage_tokens": entry.usage_tokens,
            "cost_estimate": entry.cost_estimate,
            "persona_hash": entry.persona_hash,
            "quality_score": entry.quality_score
        }
    
    def _deserialize_entry(self, data: Dict[str, Any]) -> CacheEntry:
        """Deserialize cache entry from storage"""
        return CacheEntry(
            content=data["content"],
            content_type=data["content_type"],
            model_used=data["model_used"],
            created_at=datetime.fromisoformat(data["created_at"]),
            usage_tokens=data["usage_tokens"],
            cost_estimate=data["cost_estimate"],
            persona_hash=data.get("persona_hash"),
            quality_score=data.get("quality_score")
        )


class RedisAIContentCache(AIContentCache):
    """Redis-backed AI content cache"""
    
    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        key_prefix: str = "ai_content:",
        user_key_prefix: str = "user_keys:",
        default_ttl: int = 7200,
        compress: bool = True,
        max_content_size: int = 100000  # 100KB
    ):
        if not REDIS_AVAILABLE:
            raise ImportError("redis not available. Install with: pip install redis")
        
        self.redis_url = redis_url
        self.key_prefix = key_prefix
        self.user_key_prefix = user_key_prefix
        self.default_ttl = default_ttl
        self.compress = compress
        self.max_content_size = max_content_size
        self.redis_client: Optional[redis.Redis] = None
        self.key_generator = ContentCacheKeyGenerator()
    
    async def _get_client(self) -> redis.Redis:
        """Get or create Redis client"""
        if not self.redis_client:
            self.redis_client = redis.from_url(self.redis_url)
        return self.redis_client
    
    def _make_key(self, key: str) -> str:
        """Create Redis key with prefix"""
        return f"{self.key_prefix}{key}"
    
    def _make_user_key(self, user_id: str) -> str:
        """Create user tracking key"""
        return f"{self.user_key_prefix}{user_id}"
    
    async def get(self, key: str) -> Optional[CacheEntry]:
        """Get cached content from Redis"""
        try:
            client = await self._get_client()
            redis_key = self._make_key(key)
            
            data = await client.get(redis_key)
            if not data:
                return None
            
            # Deserialize
            if self.compress:
                import pickle
                entry_data = pickle.loads(data)
            else:
                entry_data = json.loads(data.decode())
            
            return self._deserialize_entry(entry_data)
            
        except Exception as e:
            logger.error(f"Redis cache get error: {e}")
            return None
    
    async def set(
        self,
        key: str,
        entry: CacheEntry,
        ttl: Optional[int] = None
    ) -> None:
        """Store content in Redis cache"""
        if len(entry.content) > self.max_content_size:
            logger.warning(f"Content too large for cache: {len(entry.content)} bytes")
            return
        
        try:
            client = await self._get_client()
            redis_key = self._make_key(key)
            
            # Serialize entry
            entry_data = self._serialize_entry(entry)
            
            if self.compress:
                import pickle
                data = pickle.dumps(entry_data)
            else:
                data = json.dumps(entry_data)
            
            ttl_seconds = ttl or self.default_ttl
            await client.setex(redis_key, ttl_seconds, data)
            
        except Exception as e:
            logger.error(f"Redis cache set error: {e}")
    
    async def delete(self, key: str) -> None:
        """Delete cached content"""
        try:
            client = await self._get_client()
            redis_key = self._make_key(key)
            await client.delete(redis_key)
            
        except Exception as e:
            logger.error(f"Redis cache delete error: {e}")
    
    async def invalidate_user(self, user_id: str) -> int:
        """Invalidate all cache entries for a user"""
        try:
            client = await self._get_client()
            user_key = self._make_user_key(user_id)
            
            # Get user's keys
            user_keys = await client.smembers(user_key)
            if not user_keys:
                return 0
            
            # Delete all user's cached content
            redis_keys = [self._make_key(key.decode()) for key in user_keys]
            deleted = await client.delete(*redis_keys)
            
            # Clear user's key set
            await client.delete(user_key)
            
            return deleted
            
        except Exception as e:
            logger.error(f"Redis cache invalidate_user error: {e}")
            return 0
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            client = await self._get_client()
            info = await client.info()
            
            # Count keys with our prefix
            pattern = f"{self.key_prefix}*"
            key_count = 0
            total_size = 0
            
            async for key in client.scan_iter(pattern):
                key_count += 1
                size = await client.strlen(key)
                total_size += size
            
            return {
                "type": "redis",
                "total_entries": key_count,
                "total_size_bytes": total_size,
                "redis_memory_used": info.get("used_memory_human", "unknown"),
                "redis_connected_clients": info.get("connected_clients", 0),
                "key_prefix": self.key_prefix,
                "compress": self.compress,
                "max_content_size": self.max_content_size
            }
            
        except Exception as e:
            logger.error(f"Redis stats error: {e}")
            return {"type": "redis", "error": str(e)}
    
    async def close(self) -> None:
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
            self.redis_client = None
    
    def _serialize_entry(self, entry: CacheEntry) -> Dict[str, Any]:
        """Serialize cache entry for Redis storage"""
        return {
            "content": entry.content,
            "content_type": entry.content_type,
            "model_used": entry.model_used,
            "created_at": entry.created_at.isoformat(),
            "usage_tokens": entry.usage_tokens,
            "cost_estimate": entry.cost_estimate,
            "persona_hash": entry.persona_hash,
            "quality_score": entry.quality_score
        }
    
    def _deserialize_entry(self, data: Dict[str, Any]) -> CacheEntry:
        """Deserialize cache entry from Redis storage"""
        return CacheEntry(
            content=data["content"],
            content_type=data["content_type"],
            model_used=data["model_used"],
            created_at=datetime.fromisoformat(data["created_at"]),
            usage_tokens=data["usage_tokens"],
            cost_estimate=data["cost_estimate"],
            persona_hash=data.get("persona_hash"),
            quality_score=data.get("quality_score")
        )


def create_ai_content_cache(
    cache_type: str = "memory",
    cache_config: Optional[Dict[str, Any]] = None
) -> AIContentCache:
    """Factory function to create AI content cache"""
    cache_config = cache_config or {}
    
    if cache_type == "memory":
        return MemoryAIContentCache(
            max_size=cache_config.get("max_size", 5000),
            default_ttl=cache_config.get("default_ttl", 7200),
            max_content_size=cache_config.get("max_content_size", 50000)
        )
    
    elif cache_type == "redis":
        return RedisAIContentCache(
            redis_url=cache_config.get("redis_url", "redis://localhost:6379"),
            key_prefix=cache_config.get("key_prefix", "ai_content:"),
            default_ttl=cache_config.get("default_ttl", 7200),
            compress=cache_config.get("compress", True),
            max_content_size=cache_config.get("max_content_size", 100000)
        )
    
    else:
        raise ValueError(f"Unknown cache type: {cache_type}")


class IntelligentAICache:
    """
    Intelligent AI cache that combines content caching with smart invalidation
    and cache warming strategies.
    """
    
    def __init__(
        self,
        content_cache: AIContentCache,
        enable_proactive_warming: bool = True,
        quality_threshold: float = 0.8
    ):
        self.content_cache = content_cache
        self.enable_proactive_warming = enable_proactive_warming
        self.quality_threshold = quality_threshold
        self.key_generator = ContentCacheKeyGenerator()
    
    async def get_or_generate(
        self,
        content_type: str,
        source_content: str,
        persona: Optional[Dict[str, Any]],
        generator_func,
        additional_params: Optional[Dict[str, Any]] = None,
        force_regenerate: bool = False
    ) -> tuple[str, bool]:  # (content, was_cached)
        """
        Get content from cache or generate if not found.
        
        Returns:
            Tuple of (content, was_cached)
        """
        cache_key = self.key_generator.generate_key(
            content_type=content_type,
            source_content=source_content,
            persona=persona,
            additional_params=additional_params
        )
        
        # Check cache first (unless forced regeneration)
        if not force_regenerate:
            cached_entry = await self.content_cache.get(cache_key)
            if cached_entry:
                # Check quality threshold
                if (cached_entry.quality_score is None or 
                    cached_entry.quality_score >= self.quality_threshold):
                    return cached_entry.content, True
        
        # Generate new content
        try:
            result = await generator_func()
            
            # Extract content and metadata from result
            if isinstance(result, dict):
                content = result.get('content', str(result))
                model_used = result.get('model', 'unknown')
                usage_tokens = result.get('usage', {}).get('total_tokens', 0)
                cost_estimate = result.get('cost_estimate', 0.0)
            else:
                content = str(result)
                model_used = 'unknown'
                usage_tokens = 0
                cost_estimate = 0.0
            
            # Create cache entry
            entry = CacheEntry(
                content=content,
                content_type=content_type,
                model_used=model_used,
                created_at=datetime.now(),
                usage_tokens=usage_tokens,
                cost_estimate=cost_estimate,
                persona_hash=self.key_generator._hash_persona(persona) if persona else None
            )
            
            # Store in cache
            await self.content_cache.set(cache_key, entry)
            
            return content, False
            
        except Exception as e:
            logger.error(f"Content generation failed: {e}")
            raise
    
    async def invalidate_persona_content(self, user_id: str) -> int:
        """Invalidate all cached content for a user when persona changes"""
        return await self.content_cache.invalidate_user(user_id)
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics"""
        return await self.content_cache.get_stats()
    
    async def close(self) -> None:
        """Close cache connections"""
        await self.content_cache.close()


# Singleton instances (will be initialized in main.py)
ai_content_cache: Optional[IntelligentAICache] = None