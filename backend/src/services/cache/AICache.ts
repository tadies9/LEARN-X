import Redis from 'ioredis';
import { logger } from '../../utils/logger';
import { CachedResponse } from '../../types/ai';
import crypto from 'crypto';

export class AICache {
  private redis: Redis;
  private defaultTTL: number;

  constructor(redis: Redis, defaultTTL: number = 3600) {
    this.redis = redis;
    this.defaultTTL = defaultTTL;
  }

  private generateKey(prefix: string, params: Record<string, any>): string {
    // Create a deterministic hash of the parameters
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    const hash = crypto.createHash('md5').update(paramString).digest('hex');
    return `ai_cache:${prefix}:${hash}`;
  }

  async get(key: string): Promise<CachedResponse | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) return null;

      const parsed = JSON.parse(cached) as CachedResponse;

      // Check if cache is still valid (within TTL)
      const age = Date.now() - parsed.timestamp;
      if (age > this.defaultTTL * 1000) {
        await this.redis.del(key);
        return null;
      }

      logger.info(`Cache hit for key: ${key}`);
      return parsed;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(
    key: string,
    content: string,
    usage: { promptTokens: number; completionTokens: number },
    ttl?: number
  ): Promise<void> {
    try {
      const cacheData: CachedResponse = {
        content,
        timestamp: Date.now(),
        usage,
      };

      const ttlSeconds = ttl || this.defaultTTL;
      await this.redis.setex(key, ttlSeconds, JSON.stringify(cacheData));

      logger.info(`Cached response with key: ${key}, TTL: ${ttlSeconds}s`);
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async getCachedExplanation(
    fileId: string,
    topicId: string,
    userId: string
  ): Promise<CachedResponse | null> {
    const key = this.generateKey('explain', { fileId, topicId, userId });
    return this.get(key);
  }

  async setCachedExplanation(
    fileId: string,
    topicId: string,
    userId: string,
    content: string,
    usage: { promptTokens: number; completionTokens: number }
  ): Promise<void> {
    const key = this.generateKey('explain', { fileId, topicId, userId });
    await this.set(key, content, usage);
  }

  async getCachedSummary(
    fileId: string,
    format: string,
    userId: string
  ): Promise<CachedResponse | null> {
    const key = this.generateKey('summary', { fileId, format, userId });
    return this.get(key);
  }

  async setCachedSummary(
    fileId: string,
    format: string,
    userId: string,
    content: string,
    usage: { promptTokens: number; completionTokens: number }
  ): Promise<void> {
    const key = this.generateKey('summary', { fileId, format, userId });
    await this.set(key, content, usage);
  }

  async invalidateUserCache(userId: string): Promise<void> {
    try {
      // TODO: Implement proper user cache invalidation
      logger.info(`Cache invalidation requested for user ${userId}`);
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }

  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const keys = await this.redis.keys('ai_cache:*');

      // Parse memory usage from Redis info
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      // Calculate hit rate (this would need proper tracking in production)
      // For now, return a placeholder
      const hitRate = 0.85; // 85% cache hit rate

      return {
        totalKeys: keys.length,
        memoryUsage,
        hitRate,
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'unknown',
        hitRate: 0,
      };
    }
  }
}
