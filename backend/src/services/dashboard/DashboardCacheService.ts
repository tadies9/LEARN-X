import Redis from 'ioredis';
import { logger } from '../../utils/logger';

interface CacheOptions {
  ttl?: number; // seconds
  keyPrefix?: string;
}

interface DashboardCacheData {
  data: any;
  timestamp: number;
  ttl: number;
}

/**
 * Service for caching dashboard data
 * Handles cache operations for dashboard metrics
 */
export class DashboardCacheService {
  private redis: Redis;
  private defaultTTL = 300; // 5 minutes default
  private keyPrefix = 'dashboard:';

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Get cached dashboard data
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key);
      const cached = await this.redis.get(fullKey);
      
      if (!cached) {
        return null;
      }

      const parsed: DashboardCacheData = JSON.parse(cached);
      
      // Check if cache is still valid
      const age = Date.now() - parsed.timestamp;
      if (age > parsed.ttl * 1000) {
        await this.redis.del(fullKey);
        return null;
      }

      logger.debug(`Dashboard cache hit for key: ${key}`);
      return parsed.data as T;
    } catch (error) {
      logger.error('Dashboard cache get error:', error);
      return null;
    }
  }

  /**
   * Set dashboard data in cache
   */
  async set<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    try {
      const fullKey = this.buildKey(key, options?.keyPrefix);
      const ttl = options?.ttl || this.defaultTTL;
      
      const cacheData: DashboardCacheData = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      await this.redis.setex(fullKey, ttl, JSON.stringify(cacheData));
      
      logger.debug(`Dashboard data cached for key: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      logger.error('Dashboard cache set error:', error);
    }
  }

  /**
   * Get or set cached data with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate fresh data
    const data = await factory();
    
    // Cache the result
    await this.set(key, data, options);
    
    return data;
  }

  /**
   * Invalidate cache entries
   */
  async invalidate(pattern: string): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern);
      const keys = await this.redis.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const deleted = await this.redis.del(...keys);
      logger.info(`Invalidated ${deleted} dashboard cache entries matching: ${pattern}`);
      
      return deleted;
    } catch (error) {
      logger.error('Dashboard cache invalidation error:', error);
      return 0;
    }
  }

  /**
   * Invalidate all user dashboard caches
   */
  async invalidateUser(userId: string): Promise<number> {
    return this.invalidate(`user:${userId}:*`);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    keys: number;
    memoryUsage: string;
    patterns: Record<string, number>;
  }> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      // Analyze key patterns
      const patterns: Record<string, number> = {};
      keys.forEach(key => {
        const parts = key.split(':');
        if (parts.length >= 3) {
          const pattern = parts[2]; // e.g., 'stats', 'activities', etc.
          patterns[pattern] = (patterns[pattern] || 0) + 1;
        }
      });

      return {
        keys: keys.length,
        memoryUsage,
        patterns,
      };
    } catch (error) {
      logger.error('Failed to get dashboard cache stats:', error);
      return {
        keys: 0,
        memoryUsage: 'unknown',
        patterns: {},
      };
    }
  }

  /**
   * Build full cache key
   */
  private buildKey(key: string, prefix?: string): string {
    const actualPrefix = prefix || this.keyPrefix;
    return `${actualPrefix}${key}`;
  }

  /**
   * Get appropriate TTL based on data type
   */
  getTTLForDataType(dataType: string): number {
    const ttlMap: Record<string, number> = {
      'stats': 300,        // 5 minutes - general stats
      'activities': 60,    // 1 minute - recent activities
      'streak': 3600,      // 1 hour - streak calculations
      'progress': 600,     // 10 minutes - progress metrics
      'patterns': 1800,    // 30 minutes - weekly patterns
      'leaderboard': 900,  // 15 minutes - leaderboard data
    };

    return ttlMap[dataType] || this.defaultTTL;
  }
}