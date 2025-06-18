import { redisClient } from '../../config/redis';
import { logger } from '../../utils/logger';
import { SearchOptions, SearchResponse } from './types';

export class SearchCacheManager {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'search:';

  generateCacheKey(query: string, userId: string, options: Required<SearchOptions>): string {
    const key = {
      q: query,
      u: userId,
      ...options,
    };

    return `${this.CACHE_PREFIX}${Buffer.from(JSON.stringify(key)).toString('base64')}`;
  }

  async getFromCache(key: string): Promise<SearchResponse | null> {
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn('[SearchCache] Cache retrieval error:', error);
    }
    return null;
  }

  async cacheResponse(key: string, response: SearchResponse): Promise<void> {
    try {
      await redisClient.setex(key, this.CACHE_TTL, JSON.stringify(response));
    } catch (error) {
      logger.warn('[SearchCache] Cache storage error:', error);
    }
  }

  async clearCache(userId?: string): Promise<void> {
    try {
      if (userId) {
        // Clear cache for specific user
        const pattern = `${this.CACHE_PREFIX}*${userId}*`;
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } else {
        // Clear all search cache
        const keys = await redisClient.keys(`${this.CACHE_PREFIX}*`);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      }
      logger.info('[SearchCache] Cache cleared', { userId });
    } catch (error) {
      logger.error('[SearchCache] Error clearing cache:', error);
    }
  }
}

export class QueryProcessor {
  private readonly stopWords = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'has',
    'he',
    'in',
    'is',
    'it',
    'its',
    'of',
    'on',
    'that',
    'the',
    'to',
    'was',
    'will',
    'with',
    'what',
    'when',
    'where',
    'who',
    'why',
    'how',
  ]);

  preprocessQuery(query: string): string {
    // Clean and normalize query
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  extractKeywords(query: string): string[] {
    return query
      .split(/\s+/)
      .filter((word) => word.length > 2 && !this.stopWords.has(word))
      .map((word) => word.trim());
  }
}

export class SearchRanker {
  rankResults(results: SearchResult[], _options: Required<SearchOptions>): SearchResult[] {
    // Apply additional ranking factors
    return results
      .map((result) => {
        let boost = 1.0;

        // Boost high importance content
        if (result.metadata.importance === 'high') {
          boost *= 1.2;
        } else if (result.metadata.importance === 'low') {
          boost *= 0.8;
        }

        // Boost certain content types
        if (['definition', 'summary', 'introduction'].includes(result.metadata.contentType)) {
          boost *= 1.1;
        }

        // Boost if chunk is start of section
        if (result.metadata.sectionTitle) {
          boost *= 1.05;
        }

        result.score *= boost;
        return result;
      })
      .sort((a, b) => b.score - a.score);
  }

  mergeResults(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[],
    vectorWeight: number,
    keywordWeight: number
  ): SearchResult[] {
    const resultMap = new Map<string, SearchResult>();

    // Add vector results
    vectorResults.forEach((result) => {
      const existing = resultMap.get(result.id);
      if (existing) {
        existing.score =
          (existing.vectorScore || 0) * vectorWeight + (result.vectorScore || 0) * vectorWeight;
        existing.vectorScore = result.vectorScore;
      } else {
        result.score = (result.vectorScore || 0) * vectorWeight;
        resultMap.set(result.id, result);
      }
    });

    // Add keyword results
    keywordResults.forEach((result) => {
      const existing = resultMap.get(result.id);
      if (existing) {
        existing.score += (result.keywordScore || 0) * keywordWeight;
        existing.keywordScore = result.keywordScore;
      } else {
        result.score = (result.keywordScore || 0) * keywordWeight;
        resultMap.set(result.id, result);
      }
    });

    // Convert to array and sort by score
    return Array.from(resultMap.values()).sort((a, b) => b.score - a.score);
  }
}

// Import SearchResult type
import { SearchResult } from './types';
