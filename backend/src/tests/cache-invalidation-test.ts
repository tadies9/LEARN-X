import { getEnhancedAICache } from '../services/cache/EnhancedAICache';
import { CostTracker } from '../services/ai/CostTracker';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { UserPersona } from '../types/persona';

/**
 * Test script for cache invalidation on persona changes
 */
class CacheInvalidationTest {
  private cache = getEnhancedAICache(redisClient, new CostTracker());

  // Mock user persona
  private testPersona: UserPersona = {
    id: 'test-persona-1',
    userId: 'test-user-1',
    currentRole: 'Software Developer',
    industry: 'Technology',
    technicalLevel: 'intermediate',
    primaryInterests: ['programming', 'web development'],
    secondaryInterests: ['data science', 'machine learning'],
    learningStyle: 'visual',
    communicationTone: 'friendly',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Updated persona (simulating persona change)
  private updatedPersona: UserPersona = {
    ...this.testPersona,
    currentRole: 'Data Scientist',
    industry: 'Healthcare',
    technicalLevel: 'advanced',
    primaryInterests: ['machine learning', 'data analysis'],
    secondaryInterests: ['statistics', 'research'],
    learningStyle: 'kinesthetic',
    communicationTone: 'professional',
    updatedAt: new Date(),
  };

  /**
   * Run comprehensive cache invalidation tests
   */
  async runTests(): Promise<void> {
    logger.info('Starting cache invalidation tests...');

    try {
      await this.testBasicCacheOperations();
      await this.testPersonaBasedCaching();
      await this.testPersonaChangeInvalidation();
      await this.testSelectiveInvalidation();
      await this.testBulkInvalidation();
      await this.testCacheWarmingAfterInvalidation();

      logger.info('✅ All cache invalidation tests passed!');
    } catch (error) {
      logger.error('❌ Cache invalidation test failed:', error);
      throw error;
    }
  }

  /**
   * Test 1: Basic cache operations
   */
  private async testBasicCacheOperations(): Promise<void> {
    logger.info('Test 1: Basic cache operations...');

    // Set a cache entry
    await this.cache.set(
      {
        service: 'explain',
        userId: this.testPersona.userId,
        contentHash: 'test-content-hash-1',
        persona: this.testPersona,
        context: {
          difficulty: 'intermediate',
          format: 'explanation',
        },
      },
      'Test explanation content',
      { promptTokens: 100, completionTokens: 200 },
      { testData: true }
    );

    // Verify cache entry exists
    const cached = await this.cache.get({
      service: 'explain',
      userId: this.testPersona.userId,
      contentHash: 'test-content-hash-1',
      persona: this.testPersona,
      context: {
        difficulty: 'intermediate',
        format: 'explanation',
      },
    });

    if (!cached || cached.content !== 'Test explanation content') {
      throw new Error('Basic cache set/get failed');
    }

    logger.info('✅ Basic cache operations working correctly');
  }

  /**
   * Test 2: Persona-based caching
   */
  private async testPersonaBasedCaching(): Promise<void> {
    logger.info('Test 2: Persona-based caching...');

    // Cache content for original persona
    await this.cache.set(
      {
        service: 'summary',
        userId: this.testPersona.userId,
        contentHash: 'test-content-hash-2',
        persona: this.testPersona,
        context: {
          difficulty: 'basic',
          format: 'summary',
        },
      },
      'Summary for software developer',
      { promptTokens: 80, completionTokens: 150 }
    );

    // Cache content for updated persona (same user, different persona)
    await this.cache.set(
      {
        service: 'summary',
        userId: this.updatedPersona.userId,
        contentHash: 'test-content-hash-2',
        persona: this.updatedPersona,
        context: {
          difficulty: 'basic',
          format: 'summary',
        },
      },
      'Summary for data scientist',
      { promptTokens: 80, completionTokens: 150 }
    );

    // Verify both cached versions exist
    const originalCache = await this.cache.get({
      service: 'summary',
      userId: this.testPersona.userId,
      contentHash: 'test-content-hash-2',
      persona: this.testPersona,
      context: {
        difficulty: 'basic',
        format: 'summary',
      },
    });

    const updatedCache = await this.cache.get({
      service: 'summary',
      userId: this.updatedPersona.userId,
      contentHash: 'test-content-hash-2',
      persona: this.updatedPersona,
      context: {
        difficulty: 'basic',
        format: 'summary',
      },
    });

    if (!originalCache || originalCache.content !== 'Summary for software developer') {
      throw new Error('Original persona cache entry not found');
    }

    if (!updatedCache || updatedCache.content !== 'Summary for data scientist') {
      throw new Error('Updated persona cache entry not found');
    }

    logger.info('✅ Persona-based caching working correctly');
  }

  /**
   * Test 3: Cache invalidation on persona changes
   */
  private async testPersonaChangeInvalidation(): Promise<void> {
    logger.info('Test 3: Cache invalidation on persona changes...');

    // Cache multiple content types for the user
    const contentTypes = ['explain', 'quiz', 'flashcard'];
    const contentHashes = ['hash-3a', 'hash-3b', 'hash-3c'];

    for (let i = 0; i < contentTypes.length; i++) {
      await this.cache.set(
        {
          service: contentTypes[i] as any,
          userId: this.testPersona.userId,
          contentHash: contentHashes[i],
          persona: this.testPersona,
          context: {
            difficulty: 'intermediate',
            format: 'standard',
          },
        },
        `Content for ${contentTypes[i]}`,
        { promptTokens: 100, completionTokens: 200 }
      );
    }

    // Verify all entries are cached
    for (let i = 0; i < contentTypes.length; i++) {
      const cached = await this.cache.get({
        service: contentTypes[i] as any,
        userId: this.testPersona.userId,
        contentHash: contentHashes[i],
        persona: this.testPersona,
        context: {
          difficulty: 'intermediate',
          format: 'standard',
        },
      });

      if (!cached) {
        throw new Error(`Content ${contentTypes[i]} not cached before invalidation`);
      }
    }

    // Invalidate cache due to persona change
    const invalidatedCount = await this.cache.invalidate({
      userId: this.testPersona.userId,
      personaChanged: true,
    });

    logger.info(`Invalidated ${invalidatedCount} cache entries for persona change`);

    // Verify all entries are invalidated
    for (let i = 0; i < contentTypes.length; i++) {
      const cached = await this.cache.get({
        service: contentTypes[i] as any,
        userId: this.testPersona.userId,
        contentHash: contentHashes[i],
        persona: this.testPersona,
        context: {
          difficulty: 'intermediate',
          format: 'standard',
        },
      });

      if (cached) {
        throw new Error(`Content ${contentTypes[i]} still cached after invalidation`);
      }
    }

    logger.info('✅ Persona change invalidation working correctly');
  }

  /**
   * Test 4: Selective invalidation
   */
  private async testSelectiveInvalidation(): Promise<void> {
    logger.info('Test 4: Selective invalidation...');

    // Cache content for multiple users and services
    const users = ['user-4a', 'user-4b'];
    const services = ['explain', 'summary'];

    for (const userId of users) {
      for (const service of services) {
        await this.cache.set(
          {
            service: service as any,
            userId,
            contentHash: `hash-${userId}-${service}`,
            persona: { ...this.testPersona, userId },
            context: {
              difficulty: 'basic',
              format: 'standard',
            },
          },
          `Content for ${userId} ${service}`,
          { promptTokens: 50, completionTokens: 100 }
        );
      }
    }

    // Invalidate only explain service for user-4a
    const invalidatedCount = await this.cache.invalidate({
      userId: 'user-4a',
      service: 'explain',
    });

    logger.info(`Selectively invalidated ${invalidatedCount} cache entries`);

    // Verify selective invalidation
    const shouldBeInvalidated = await this.cache.get({
      service: 'explain',
      userId: 'user-4a',
      contentHash: 'hash-user-4a-explain',
      persona: { ...this.testPersona, userId: 'user-4a' },
      context: {
        difficulty: 'basic',
        format: 'standard',
      },
    });

    const shouldRemain = await this.cache.get({
      service: 'summary',
      userId: 'user-4a',
      contentHash: 'hash-user-4a-summary',
      persona: { ...this.testPersona, userId: 'user-4a' },
      context: {
        difficulty: 'basic',
        format: 'standard',
      },
    });

    if (shouldBeInvalidated) {
      throw new Error('Selective invalidation failed - entry still exists');
    }

    if (!shouldRemain) {
      throw new Error('Selective invalidation too broad - unrelated entry was removed');
    }

    logger.info('✅ Selective invalidation working correctly');
  }

  /**
   * Test 5: Bulk invalidation
   */
  private async testBulkInvalidation(): Promise<void> {
    logger.info('Test 5: Bulk invalidation...');

    // Cache many entries for testing bulk operations
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        this.cache.set(
          {
            service: 'explain',
            userId: `bulk-user-${i}`,
            contentHash: `bulk-hash-${i}`,
            persona: { ...this.testPersona, userId: `bulk-user-${i}` },
            context: {
              difficulty: 'intermediate',
              format: 'bulk-test',
            },
          },
          `Bulk content ${i}`,
          { promptTokens: 30, completionTokens: 60 }
        )
      );
    }

    await Promise.all(promises);

    // Perform bulk invalidation
    const invalidatedCount = await this.cache.invalidate({
      service: 'explain',
    });

    logger.info(`Bulk invalidated ${invalidatedCount} cache entries`);

    // Verify bulk invalidation
    for (let i = 0; i < 10; i++) {
      const cached = await this.cache.get({
        service: 'explain',
        userId: `bulk-user-${i}`,
        contentHash: `bulk-hash-${i}`,
        persona: { ...this.testPersona, userId: `bulk-user-${i}` },
        context: {
          difficulty: 'intermediate',
          format: 'bulk-test',
        },
      });

      if (cached) {
        throw new Error(`Bulk invalidation failed - entry ${i} still exists`);
      }
    }

    logger.info('✅ Bulk invalidation working correctly');
  }

  /**
   * Test 6: Cache warming after invalidation
   */
  private async testCacheWarmingAfterInvalidation(): Promise<void> {
    logger.info('Test 6: Cache warming after invalidation...');

    // Cache initial content
    await this.cache.set(
      {
        service: 'summary',
        userId: 'warm-test-user',
        contentHash: 'warm-test-hash',
        persona: this.testPersona,
        context: {
          difficulty: 'basic',
          format: 'warming-test',
        },
      },
      'Original content',
      { promptTokens: 70, completionTokens: 140 }
    );

    // Invalidate the cache
    await this.cache.invalidate({
      userId: 'warm-test-user',
      personaChanged: true,
    });

    // Verify invalidation
    const afterInvalidation = await this.cache.get({
      service: 'summary',
      userId: 'warm-test-user',
      contentHash: 'warm-test-hash',
      persona: this.testPersona,
      context: {
        difficulty: 'basic',
        format: 'warming-test',
      },
    });

    if (afterInvalidation) {
      throw new Error('Cache invalidation failed in warming test');
    }

    // Test cache warming
    await this.cache.warmCache(
      {
        service: 'summary',
        userId: 'warm-test-user',
        contentHash: 'warm-test-hash',
        persona: this.updatedPersona,
        context: {
          difficulty: 'basic',
          format: 'warming-test',
        },
      },
      async () => ({
        content: 'Warmed content for updated persona',
        usage: { promptTokens: 80, completionTokens: 160 },
      })
    );

    // Verify warming worked
    const afterWarming = await this.cache.get({
      service: 'summary',
      userId: 'warm-test-user',
      contentHash: 'warm-test-hash',
      persona: this.updatedPersona,
      context: {
        difficulty: 'basic',
        format: 'warming-test',
      },
    });

    if (!afterWarming || afterWarming.content !== 'Warmed content for updated persona') {
      throw new Error('Cache warming after invalidation failed');
    }

    logger.info('✅ Cache warming after invalidation working correctly');
  }

  /**
   * Get test statistics
   */
  async getTestStats(): Promise<{
    totalCacheKeys: number;
    hitRate: number;
    testCoverage: string[];
  }> {
    const stats = await this.cache.getStats();
    const detailedMetrics = await this.cache.getDetailedMetrics();

    // Calculate overall hit rate
    let totalHits = 0;
    let totalMisses = 0;
    Object.values(stats).forEach((serviceStats) => {
      totalHits += serviceStats.hits;
      totalMisses += serviceStats.misses;
    });

    const hitRate = totalHits / (totalHits + totalMisses) || 0;

    return {
      totalCacheKeys: detailedMetrics.totalKeys,
      hitRate,
      testCoverage: [
        'Basic cache operations',
        'Persona-based caching',
        'Persona change invalidation',
        'Selective invalidation',
        'Bulk invalidation',
        'Cache warming after invalidation',
      ],
    };
  }
}

/**
 * Main test runner
 */
async function runCacheInvalidationTests(): Promise<void> {
  const test = new CacheInvalidationTest();

  try {
    await test.runTests();
    const stats = await test.getTestStats();

    logger.info('=== Test Summary ===');
    logger.info(`Total cache keys: ${stats.totalCacheKeys}`);
    logger.info(`Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    logger.info(`Test coverage: ${stats.testCoverage.length} test scenarios`);
    logger.info('===================');
  } catch (error) {
    logger.error('Cache invalidation tests failed:', error);
    process.exit(1);
  }
}

// Export for use in other test files
export { CacheInvalidationTest, runCacheInvalidationTests };

// Run tests if called directly
if (require.main === module) {
  runCacheInvalidationTests();
}
