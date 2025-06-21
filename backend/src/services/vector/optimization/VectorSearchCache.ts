import { redisClient } from '../../../config/redis';
import { logger } from '../../../utils/logger';
import { VectorSearchResult, VectorSearchOptions } from '../interfaces/IVectorStore';
import crypto from 'crypto';

export interface CacheConfig {
  ttlSeconds: number;
  maxResults: number;
  keyPrefix: string;
  enableCompression: boolean;
  adaptiveTTL: boolean;
  popularityThreshold: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  avgResponseTime: number;
}

export interface CachedSearchResult {
  results: VectorSearchResult[];
  timestamp: number;
  queryHash: string;
  popularity: number;
  size: number;
}

export class VectorSearchCache {
  private config: CacheConfig;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
    avgResponseTime: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      ttlSeconds: 3600, // 1 hour default
      maxResults: 1000,
      keyPrefix: 'vector:cache:',
      enableCompression: true,
      adaptiveTTL: true,
      popularityThreshold: 5,
      ...config,
    };
  }

  /**
   * Get cached search results
   */
  async get(
    queryVector: number[],
    options: VectorSearchOptions,
    provider: string
  ): Promise<VectorSearchResult[] | null> {
    const startTime = Date.now();

    try {
      const cacheKey = this.generateCacheKey(queryVector, options, provider);
      const cachedData = await redisClient.get(cacheKey);

      if (!cachedData) {
        this.metrics.misses++;
        this.updateMetrics();
        return null;
      }

      const cached: CachedSearchResult = JSON.parse(cachedData);

      // Check if cache entry is still valid
      if (this.isCacheValid(cached)) {
        // Update popularity and TTL
        await this.updateCacheEntry(cacheKey, cached);

        this.metrics.hits++;
        this.metrics.avgResponseTime =
          (this.metrics.avgResponseTime + (Date.now() - startTime)) / 2;
        this.updateMetrics();

        logger.debug('[VectorCache] Cache hit', {
          queryHash: cached.queryHash,
          resultCount: cached.results.length,
          popularity: cached.popularity,
        });

        return cached.results;
      } else {
        // Cache entry expired or invalid
        await this.delete(cacheKey);
        this.metrics.misses++;
        this.updateMetrics();
        return null;
      }
    } catch (error) {
      logger.error('[VectorCache] Error getting from cache:', error);
      this.metrics.misses++;
      this.updateMetrics();
      return null;
    }
  }

  /**
   * Store search results in cache
   */
  async set(
    queryVector: number[],
    options: VectorSearchOptions,
    provider: string,
    results: VectorSearchResult[]
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(queryVector, options, provider);
      const queryHash = this.hashQuery(queryVector, options);

      // Check if we should cache this result
      if (!this.shouldCache(results)) {
        return;
      }

      const cachedResult: CachedSearchResult = {
        results: this.limitResults(results),
        timestamp: Date.now(),
        queryHash,
        popularity: 1,
        size: this.estimateSize(results),
      };

      const serialized = JSON.stringify(cachedResult);
      const ttl = this.calculateTTL(cachedResult);

      await redisClient.setex(cacheKey, ttl, serialized);

      // Update cache size metric
      this.metrics.size += cachedResult.size;

      logger.debug('[VectorCache] Cached search results', {
        queryHash,
        resultCount: results.length,
        ttl,
        sizeBytes: cachedResult.size,
      });
    } catch (error) {
      logger.error('[VectorCache] Error setting cache:', error);
    }
  }

  /**
   * Get similar cached queries (for query expansion)
   */
  async getSimilarQueries(_queryVector: number[], _threshold: number = 0.9): Promise<string[]> {
    try {
      // This is a simplified implementation
      // In practice, you'd use a more sophisticated similarity search
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await redisClient.keys(pattern);

      const similarQueries: string[] = [];

      for (const key of keys.slice(0, 100)) {
        // Limit to avoid performance issues
        try {
          const cachedData = await redisClient.get(key);
          if (cachedData) {
            const cached: CachedSearchResult = JSON.parse(cachedData);
            // In practice, you'd compare the actual query vectors for similarity
            if (cached.popularity >= this.config.popularityThreshold) {
              similarQueries.push(cached.queryHash);
            }
          }
        } catch (error) {
          // Skip invalid cache entries
          continue;
        }
      }

      return similarQueries.slice(0, 10); // Return top 10 similar queries
    } catch (error) {
      logger.error('[VectorCache] Error finding similar queries:', error);
      return [];
    }
  }

  /**
   * Warm up cache with popular queries
   */
  async warmup(
    popularQueries: Array<{
      queryVector: number[];
      options: VectorSearchOptions;
      provider: string;
    }>
  ): Promise<void> {
    logger.info('[VectorCache] Starting cache warmup', {
      queryCount: popularQueries.length,
    });

    const warmupPromises = popularQueries.map(async ({ queryVector, options, provider }) => {
      try {
        // Check if already cached
        const cached = await this.get(queryVector, options, provider);
        if (cached) {
          return; // Already cached
        }

        // Note: In practice, you'd need to execute the actual search
        // and then cache the results. This is just a placeholder.
        logger.debug('[VectorCache] Would execute warmup query for:', {
          queryHash: this.hashQuery(queryVector, options),
        });
      } catch (error) {
        logger.error('[VectorCache] Error during warmup:', error);
      }
    });

    await Promise.all(warmupPromises);
    logger.info('[VectorCache] Cache warmup completed');
  }

  /**
   * Clear cache entries matching pattern
   */
  async clear(pattern?: string): Promise<number> {
    try {
      const searchPattern = pattern || `${this.config.keyPrefix}*`;
      const keys = await redisClient.keys(searchPattern);

      if (keys.length === 0) {
        return 0;
      }

      await redisClient.del(...keys);

      // Reset metrics if clearing all
      if (!pattern) {
        this.metrics = {
          hits: 0,
          misses: 0,
          size: 0,
          hitRate: 0,
          avgResponseTime: 0,
        };
      }

      logger.info('[VectorCache] Cleared cache entries', {
        pattern: searchPattern,
        count: keys.length,
      });

      return keys.length;
    } catch (error) {
      logger.error('[VectorCache] Error clearing cache:', error);
      return 0;
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get detailed cache statistics
   */
  async getDetailedStats(): Promise<{
    metrics: CacheMetrics;
    topQueries: Array<{
      queryHash: string;
      popularity: number;
      lastAccessed: Date;
    }>;
    sizeDistribution: {
      small: number; // < 10 results
      medium: number; // 10-50 results
      large: number; // > 50 results
    };
  }> {
    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await redisClient.keys(pattern);

      const topQueries: Array<{ queryHash: string; popularity: number; lastAccessed: Date }> = [];
      const sizeDistribution = { small: 0, medium: 0, large: 0 };

      for (const key of keys.slice(0, 100)) {
        try {
          const cachedData = await redisClient.get(key);
          if (cachedData) {
            const cached: CachedSearchResult = JSON.parse(cachedData);

            topQueries.push({
              queryHash: cached.queryHash,
              popularity: cached.popularity,
              lastAccessed: new Date(cached.timestamp),
            });

            const resultCount = cached.results.length;
            if (resultCount < 10) {
              sizeDistribution.small++;
            } else if (resultCount <= 50) {
              sizeDistribution.medium++;
            } else {
              sizeDistribution.large++;
            }
          }
        } catch (error) {
          // Skip invalid entries
          continue;
        }
      }

      // Sort top queries by popularity
      topQueries.sort((a, b) => b.popularity - a.popularity);

      return {
        metrics: this.getMetrics(),
        topQueries: topQueries.slice(0, 20),
        sizeDistribution,
      };
    } catch (error) {
      logger.error('[VectorCache] Error getting detailed stats:', error);
      return {
        metrics: this.getMetrics(),
        topQueries: [],
        sizeDistribution: { small: 0, medium: 0, large: 0 },
      };
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidate(invalidationRules: {
    fileId?: string;
    userId?: string;
    olderThan?: Date;
  }): Promise<number> {
    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await redisClient.keys(pattern);
      const keysToDelete: string[] = [];

      for (const key of keys) {
        try {
          const cachedData = await redisClient.get(key);
          if (cachedData) {
            const cached: CachedSearchResult = JSON.parse(cachedData);

            let shouldInvalidate = false;

            // Check if any results match invalidation rules
            if (invalidationRules.fileId) {
              const hasMatchingFile = cached.results.some(
                (result) => result.metadata?.fileId === invalidationRules.fileId
              );
              if (hasMatchingFile) shouldInvalidate = true;
            }

            if (invalidationRules.olderThan) {
              if (cached.timestamp < invalidationRules.olderThan.getTime()) {
                shouldInvalidate = true;
              }
            }

            if (shouldInvalidate) {
              keysToDelete.push(key);
            }
          }
        } catch (error) {
          // Invalid entry, mark for deletion
          keysToDelete.push(key);
        }
      }

      if (keysToDelete.length > 0) {
        await redisClient.del(...keysToDelete);
      }

      logger.info('[VectorCache] Invalidated cache entries', {
        rules: invalidationRules,
        count: keysToDelete.length,
      });

      return keysToDelete.length;
    } catch (error) {
      logger.error('[VectorCache] Error invalidating cache:', error);
      return 0;
    }
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(
    queryVector: number[],
    options: VectorSearchOptions,
    provider: string
  ): string {
    const hash = this.hashQuery(queryVector, options);
    return `${this.config.keyPrefix}${provider}:${hash}`;
  }

  /**
   * Generate hash for query (for deduplication)
   */
  private hashQuery(queryVector: number[], options: VectorSearchOptions): string {
    // Round vector components to reduce precision for better cache hits
    const roundedVector = queryVector.map((v) => Math.round(v * 10000) / 10000);

    const queryData = {
      vector: roundedVector,
      topK: options.topK,
      threshold: options.threshold,
      filter: options.filter,
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(queryData))
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for shorter keys
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(cached: CachedSearchResult): boolean {
    const now = Date.now();
    const age = now - cached.timestamp;
    const maxAge = this.calculateTTL(cached) * 1000; // Convert to milliseconds

    return age < maxAge;
  }

  /**
   * Calculate TTL based on popularity and adaptive settings
   */
  private calculateTTL(cached: CachedSearchResult): number {
    let ttl = this.config.ttlSeconds;

    if (this.config.adaptiveTTL) {
      // Popular queries get longer TTL
      const popularityMultiplier = Math.min(
        cached.popularity / this.config.popularityThreshold,
        3 // Max 3x TTL
      );
      ttl = Math.floor(ttl * (1 + popularityMultiplier));
    }

    return ttl;
  }

  /**
   * Check if results should be cached
   */
  private shouldCache(results: VectorSearchResult[]): boolean {
    // Don't cache empty results
    if (results.length === 0) {
      return false;
    }

    // Don't cache very large result sets
    if (results.length > this.config.maxResults) {
      return false;
    }

    // Don't cache if estimated size is too large
    const estimatedSize = this.estimateSize(results);
    if (estimatedSize > 1024 * 1024) {
      // 1MB limit
      return false;
    }

    return true;
  }

  /**
   * Limit results to max cache size
   */
  private limitResults(results: VectorSearchResult[]): VectorSearchResult[] {
    return results.slice(0, this.config.maxResults);
  }

  /**
   * Estimate serialized size of results
   */
  private estimateSize(results: VectorSearchResult[]): number {
    // Rough estimate: each result averages ~500 bytes when serialized
    return results.length * 500;
  }

  /**
   * Update cache entry with new access info
   */
  private async updateCacheEntry(cacheKey: string, cached: CachedSearchResult): Promise<void> {
    try {
      cached.popularity++;
      cached.timestamp = Date.now();

      const serialized = JSON.stringify(cached);
      const ttl = this.calculateTTL(cached);

      await redisClient.setex(cacheKey, ttl, serialized);
    } catch (error) {
      logger.error('[VectorCache] Error updating cache entry:', error);
    }
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  /**
   * Delete specific cache entry
   */
  private async delete(cacheKey: string): Promise<void> {
    try {
      await redisClient.del(cacheKey);
    } catch (error) {
      logger.error('[VectorCache] Error deleting cache entry:', error);
    }
  }
}

// Export singleton instance
export const vectorSearchCache = new VectorSearchCache();
