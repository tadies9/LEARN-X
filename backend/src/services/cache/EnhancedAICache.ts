import Redis from 'ioredis';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { CachedResponse } from '../../types/ai';
import { UserPersona } from '../../types/persona';
import { personalizedCacheKeyGenerator } from './PersonalizedCacheKeyGenerator';
import { CostTracker } from '../ai/CostTracker';

interface CacheOptions {
  service:
    | 'explain'
    | 'summary'
    | 'quiz'
    | 'flashcard'
    | 'chat'
    | 'embedding'
    | 'practice'
    | 'introduction';
  userId: string;
  contentHash?: string;
  persona?: UserPersona;
  context?: {
    moduleId?: string;
    courseId?: string;
    sessionContext?: string;
    difficulty?: string;
    format?: string;
  };
  additionalParams?: Record<string, any>;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSaved: number;
  costSaved: number;
}

export class EnhancedAICache {
  private redis: Redis;
  private stats: Map<string, CacheStats> = new Map();
  private defaultTTL: number = 3600; // Default TTL for legacy methods

  constructor(redis: Redis, _costTracker: CostTracker) {
    this.redis = redis;
    this.initializeStats();
  }

  /**
   * Legacy method for backward compatibility - generates basic cache key
   */
  private generateLegacyKey(prefix: string, params: Record<string, any>): string {
    // Create a deterministic hash of the parameters (from old AICache)
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    const hash = crypto.createHash('md5').update(paramString).digest('hex');
    return `ai_cache:${prefix}:${hash}`;
  }

  /**
   * Legacy get method for backward compatibility
   */
  async getLegacy(key: string): Promise<CachedResponse | null> {
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

      logger.info(`Cache hit for legacy key: ${key}`);
      return parsed;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Legacy set method for backward compatibility
   */
  async setLegacy(
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

      logger.info(`Cached response with legacy key: ${key}, TTL: ${ttlSeconds}s`);
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  /**
   * Legacy method - cached explanation
   */
  async getCachedExplanation(
    fileId: string,
    topicId: string,
    userId: string
  ): Promise<CachedResponse | null> {
    const key = this.generateLegacyKey('explain', { fileId, topicId, userId });
    return this.getLegacy(key);
  }

  /**
   * Legacy method - set cached explanation
   */
  async setCachedExplanation(
    fileId: string,
    topicId: string,
    userId: string,
    content: string,
    usage: { promptTokens: number; completionTokens: number }
  ): Promise<void> {
    const key = this.generateLegacyKey('explain', { fileId, topicId, userId });
    await this.setLegacy(key, content, usage);
  }

  /**
   * Legacy method - cached summary
   */
  async getCachedSummary(
    fileId: string,
    format: string,
    userId: string
  ): Promise<CachedResponse | null> {
    const key = this.generateLegacyKey('summary', { fileId, format, userId });
    return this.getLegacy(key);
  }

  /**
   * Legacy method - set cached summary
   */
  async setCachedSummary(
    fileId: string,
    format: string,
    userId: string,
    content: string,
    usage: { promptTokens: number; completionTokens: number }
  ): Promise<void> {
    const key = this.generateLegacyKey('summary', { fileId, format, userId });
    await this.setLegacy(key, content, usage);
  }

  /**
   * Legacy user cache invalidation
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidate({ userId });
  }

  /**
   * Get cached AI response with personalization support
   */
  async get(options: CacheOptions): Promise<CachedResponse | null> {
    const key = personalizedCacheKeyGenerator.generateKey(options);

    try {
      const cached = await this.redis.get(key);
      if (!cached) {
        this.recordMiss(options.service);
        return null;
      }

      const parsed = JSON.parse(cached) as CachedResponse;

      // Validate cache freshness
      const ttl = personalizedCacheKeyGenerator.getTTL(options.service, {
        personalizationScore: personalizedCacheKeyGenerator.calculatePersonalizationScore(
          options.persona
        ),
      });

      const age = Date.now() - parsed.timestamp;
      if (age > ttl * 1000) {
        await this.redis.del(key);
        this.recordMiss(options.service);
        return null;
      }

      this.recordHit(options.service, parsed.usage);
      logger.info(`Cache hit for ${options.service}`, {
        userId: options.userId,
        key: key.substring(0, 50),
        age: Math.floor(age / 1000),
      });

      return parsed;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached AI response with automatic TTL calculation
   */
  async set(
    options: CacheOptions,
    content: string,
    usage: { promptTokens: number; completionTokens: number },
    metadata?: Record<string, any>
  ): Promise<void> {
    const key = personalizedCacheKeyGenerator.generateKey(options);

    try {
      const cacheData: CachedResponse = {
        content,
        timestamp: Date.now(),
        usage,
        metadata: {
          ...metadata,
          personalizationScore: personalizedCacheKeyGenerator.calculatePersonalizationScore(
            options.persona
          ),
          service: options.service,
        },
      };

      const ttl = personalizedCacheKeyGenerator.getTTL(options.service, {
        personalizationScore: cacheData.metadata?.personalizationScore,
      });

      await this.redis.setex(key, ttl, JSON.stringify(cacheData));

      logger.info(`Cached ${options.service} response`, {
        userId: options.userId,
        key: key.substring(0, 50),
        ttl,
        tokens: usage.promptTokens + usage.completionTokens,
      });
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  /**
   * Invalidate cache based on various criteria
   */
  async invalidate(criteria: {
    userId?: string;
    service?: string;
    personaChanged?: boolean;
    contentUpdated?: boolean;
    moduleId?: string;
  }): Promise<number> {
    try {
      const pattern = personalizedCacheKeyGenerator.generateInvalidationPattern(criteria);
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      // Delete in batches to avoid blocking
      const batchSize = 100;
      let deleted = 0;

      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        deleted += await this.redis.del(...batch);
      }

      logger.info('Cache invalidation completed', {
        pattern,
        keysFound: keys.length,
        keysDeleted: deleted,
        criteria,
      });

      return deleted;
    } catch (error) {
      logger.error('Cache invalidation error:', error);
      return 0;
    }
  }

  /**
   * Warm cache for popular or predicted content
   */
  async warmCache(
    options: CacheOptions,
    generator: () => Promise<{ content: string; usage: any }>
  ): Promise<void> {
    try {
      // Check if already cached
      const existing = await this.get(options);
      if (existing) {
        logger.info('Cache already warm for key', { service: options.service });
        return;
      }

      // Generate and cache
      const { content, usage } = await generator();
      await this.set(options, content, usage);

      logger.info('Cache warmed successfully', {
        service: options.service,
        userId: options.userId,
      });
    } catch (error) {
      logger.error('Cache warming error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(service?: string): Promise<Record<string, CacheStats>> {
    if (service) {
      const stats = this.stats.get(service) || this.createEmptyStats();
      return { [service]: stats };
    }

    const allStats: Record<string, CacheStats> = {};
    this.stats.forEach((stats, key) => {
      allStats[key] = stats;
    });

    return allStats;
  }

  /**
   * Get detailed cache metrics
   */
  async getDetailedMetrics(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    avgTTL: number;
    keyDistribution: Record<string, number>;
    costSavings: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  }> {
    try {
      // Get all cache keys
      const keys = await this.redis.keys('ai_cache:v2:*');

      // Get memory info
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      // Analyze key distribution
      const keyDistribution: Record<string, number> = {};
      let totalTTL = 0;

      for (const key of keys) {
        const parsed = personalizedCacheKeyGenerator.parseKey(key);
        if (parsed) {
          keyDistribution[parsed.service] = (keyDistribution[parsed.service] || 0) + 1;
          const ttl = await this.redis.ttl(key);
          if (ttl > 0) totalTTL += ttl;
        }
      }

      // Calculate cost savings
      const now = Date.now();
      const dailySaved = await this.calculateCostSavings(now - 24 * 3600 * 1000, now);
      const weeklySaved = await this.calculateCostSavings(now - 7 * 24 * 3600 * 1000, now);
      const monthlySaved = await this.calculateCostSavings(now - 30 * 24 * 3600 * 1000, now);

      return {
        totalKeys: keys.length,
        memoryUsage,
        avgTTL: keys.length > 0 ? Math.floor(totalTTL / keys.length) : 0,
        keyDistribution,
        costSavings: {
          daily: dailySaved,
          weekly: weeklySaved,
          monthly: monthlySaved,
        },
      };
    } catch (error) {
      logger.error('Failed to get detailed metrics:', error);
      throw error;
    }
  }

  /**
   * Initialize statistics tracking
   */
  private initializeStats(): void {
    const services = [
      'explain',
      'summary',
      'quiz',
      'flashcard',
      'chat',
      'embedding',
      'practice',
      'introduction',
    ];
    services.forEach((service) => {
      this.stats.set(service, this.createEmptyStats());
    });
  }

  /**
   * Create empty stats object
   */
  private createEmptyStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalSaved: 0,
      costSaved: 0,
    };
  }

  /**
   * Record cache hit
   */
  private recordHit(
    service: string,
    usage: { promptTokens: number; completionTokens: number }
  ): void {
    const stats = this.stats.get(service) || this.createEmptyStats();
    stats.hits++;
    stats.totalSaved += usage.promptTokens + usage.completionTokens;
    stats.hitRate = stats.hits / (stats.hits + stats.misses);

    // Estimate cost saved (rough estimate)
    const costPerToken = 0.00002; // Average across models
    stats.costSaved += (usage.promptTokens + usage.completionTokens) * costPerToken;

    this.stats.set(service, stats);
  }

  /**
   * Record cache miss
   */
  private recordMiss(service: string): void {
    const stats = this.stats.get(service) || this.createEmptyStats();
    stats.misses++;
    stats.hitRate = stats.hits / (stats.hits + stats.misses);
    this.stats.set(service, stats);
  }

  /**
   * Calculate cost savings for a time period
   */
  private async calculateCostSavings(startTime: number, endTime: number): Promise<number> {
    let totalSaved = 0;

    this.stats.forEach((stats) => {
      // This is a simplified calculation
      // In production, you'd want to track timestamps for accurate period calculations
      const periodRatio = (endTime - startTime) / (30 * 24 * 3600 * 1000); // Fraction of month
      totalSaved += stats.costSaved * periodRatio;
    });

    return totalSaved;
  }

  /**
   * Clear all cache entries (use with caution)
   */
  async clearAll(): Promise<void> {
    const keys = await this.redis.keys('ai_cache:v2:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    this.initializeStats();
    logger.warn(`Cleared all cache entries (${keys.length} keys)`);
  }
}

// Export singleton instance
let enhancedAICacheInstance: EnhancedAICache | null = null;

export function getEnhancedAICache(redis: Redis, costTracker: CostTracker): EnhancedAICache {
  if (!enhancedAICacheInstance) {
    enhancedAICacheInstance = new EnhancedAICache(redis, costTracker);
  }
  return enhancedAICacheInstance;
}
