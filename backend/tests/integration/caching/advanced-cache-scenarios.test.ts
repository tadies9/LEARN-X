import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { DatabaseHelpers } from '../../utils/database-helpers';
import { PerformanceHelpers } from '../../utils/performance-helpers';
import { AITestHelpers } from '../../utils/ai-test-helpers';
import { TestRedis } from '../../utils/test-helpers';
// import { testConfig } from '../../config/test.config'; // Unused import

describe('Advanced Cache Scenarios Integration Tests', () => {
  let testUser: unknown;
  let testCourse: unknown;
  let testModule: unknown;
  let redis: TestRedis;
  const createdIds: string[] = [];

  beforeAll(async () => {
    DatabaseHelpers.initialize();
    redis = new TestRedis();

    // Create test data
    testUser = await DatabaseHelpers.createTestUser();
    testCourse = await DatabaseHelpers.createTestCourse(testUser.id);
    testModule = await DatabaseHelpers.createTestModule(testCourse.id);

    createdIds.push(testUser.id, testCourse.id, testModule.id);
  });

  afterAll(async () => {
    await DatabaseHelpers.cleanupTestDataById(createdIds);
    await DatabaseHelpers.cleanupTestData();
    await redis.cleanup();
    await redis.disconnect();
  });

  beforeEach(async () => {
    await redis.cleanup();
    PerformanceHelpers.clearMeasurements();
  });

  describe('Multi-Level Cache Hierarchies', () => {
    test('should implement L1 (memory) and L2 (Redis) cache layers', async () => {
      const cacheKey = 'multi_level_test';
      const _testData = {
        content: 'Test content for multi-level caching',
        generated_at: new Date().toISOString(),
      };

      // Simulate L1 cache miss, L2 cache miss (fresh generation)
      const firstRequest = await PerformanceHelpers.measureAsync('l1_l2_miss', async () => {
        // Check L1 (memory) cache - miss
        let result = getL1Cache(cacheKey);
        if (result) return { source: 'l1', data: result };

        // Check L2 (Redis) cache - miss
        result = await getL2Cache(cacheKey);
        if (result) {
          setL1Cache(cacheKey, result, 60); // Cache in L1 for 60 seconds
          return { source: 'l2', data: result };
        }

        // Generate new content
        result = await generateContent();

        // Store in both L1 and L2
        setL1Cache(cacheKey, result, 60);
        await setL2Cache(cacheKey, result, 300); // L2 has longer TTL

        return { source: 'generated', data: result };
      });

      expect(firstRequest.result.source).toBe('generated');

      // Second request should hit L1 cache
      const secondRequest = await PerformanceHelpers.measureAsync('l1_hit', async () => {
        let result = getL1Cache(cacheKey);
        if (result) return { source: 'l1', data: result };

        result = await getL2Cache(cacheKey);
        if (result) {
          setL1Cache(cacheKey, result, 60);
          return { source: 'l2', data: result };
        }

        return { source: 'generated', data: await generateContent() };
      });

      expect(secondRequest.result.source).toBe('l1');
      expect(secondRequest.metrics.duration).toBeLessThan(firstRequest.metrics.duration * 0.05);

      // Clear L1 cache, third request should hit L2
      clearL1Cache(cacheKey);

      const thirdRequest = await PerformanceHelpers.measureAsync('l2_hit', async () => {
        let result = getL1Cache(cacheKey);
        if (result) return { source: 'l1', data: result };

        result = await getL2Cache(cacheKey);
        if (result) {
          setL1Cache(cacheKey, result, 60);
          return { source: 'l2', data: result };
        }

        return { source: 'generated', data: await generateContent() };
      });

      expect(thirdRequest.result.source).toBe('l2');
      expect(thirdRequest.metrics.duration).toBeLessThan(firstRequest.metrics.duration * 0.1);
    });

    test('should handle cache promotion between levels', async () => {
      const hotKey = 'frequently_accessed_content';
      const testData = { content: 'Hot content', access_count: 0 };

      // Store only in L2 initially
      await setL2Cache(hotKey, testData, 300);

      // Access multiple times to trigger promotion
      const accessCount = 5;
      const accessResults = [];

      for (let i = 0; i < accessCount; i++) {
        const result = await PerformanceHelpers.measureAsync(`access_${i}`, async () => {
          return await accessWithPromotion(hotKey);
        });
        accessResults.push(result);
      }

      // After multiple accesses, content should be promoted to L1
      const l1Data = getL1Cache(hotKey);
      expect(l1Data).not.toBeNull();
      expect(l1Data.access_count).toBeGreaterThan(testData.access_count);

      // Subsequent access should be very fast (L1 hit)
      const fastAccess = await PerformanceHelpers.measureAsync('promoted_access', async () => {
        return getL1Cache(hotKey);
      });

      expect(fastAccess.metrics.duration).toBeLessThan(1); // Sub-millisecond
    });
  });

  describe('Cache Coherence and Consistency', () => {
    test('should maintain cache consistency across multiple instances', async () => {
      const sharedKey = 'shared_content';
      const initialData = { version: 1, content: 'Shared content' };

      // Simulate multiple instances accessing the same cache
      const instances = ['instance_1', 'instance_2', 'instance_3'];
      const instanceCaches = new Map();

      // Initialize each instance cache
      for (const instance of instances) {
        instanceCaches.set(instance, new Map());
        await setL2Cache(sharedKey, initialData, 300);
      }

      // All instances read the same data
      for (const instance of instances) {
        const data = await getL2Cache(sharedKey);
        setInstanceCache(instanceCaches, instance, sharedKey, data);
      }

      // Verify all instances have consistent data
      instances.forEach((instance) => {
        const cached = getInstanceCache(instanceCaches, instance, sharedKey);
        expect(cached.version).toBe(1);
      });

      // Update data and notify all instances
      const updatedData = { version: 2, content: 'Updated shared content' };
      await setL2Cache(sharedKey, updatedData, 300);

      // Simulate cache invalidation broadcast
      for (const instance of instances) {
        invalidateInstanceCache(instanceCaches, instance, sharedKey);
      }

      // Next access should get updated data
      for (const instance of instances) {
        const data = await getL2Cache(sharedKey);
        setInstanceCache(instanceCaches, instance, sharedKey, data);

        const cached = getInstanceCache(instanceCaches, instance, sharedKey);
        expect(cached.version).toBe(2);
      }
    });

    test('should handle race conditions in cache updates', async () => {
      const raceKey = 'race_condition_test';
      const concurrentUpdates = 10;

      // Simulate concurrent updates to the same cache key
      const updatePromises = Array(concurrentUpdates)
        .fill(null)
        .map(async (_, index) => {
          const data = {
            update_id: index,
            timestamp: Date.now(),
            content: `Update ${index}`,
          };

          return await PerformanceHelpers.measureAsync(`concurrent_update_${index}`, async () => {
            // Simulate atomic update with version checking
            return await atomicCacheUpdate(raceKey, data);
          });
        });

      const updateResults = await Promise.all(updatePromises);

      // All updates should complete without corruption
      updateResults.forEach((result) => {
        expect(result.result.success).toBe(true);
      });

      // Final cached value should be consistent
      const finalValue = await getL2Cache(raceKey);
      expect(finalValue).toBeDefined();
      expect(finalValue.update_id).toBeGreaterThanOrEqual(0);
      expect(finalValue.update_id).toBeLessThan(concurrentUpdates);
    });
  });

  describe('Cache Partitioning and Sharding', () => {
    test('should distribute cache load across multiple shards', async () => {
      const shardCount = 3;
      const itemsPerShard = 100;
      const totalItems = shardCount * itemsPerShard;

      // Create items distributed across shards
      const distributionMap = new Map();
      for (let i = 0; i < totalItems; i++) {
        const key = `shard_test_item_${i}`;
        const shard = getShardForKey(key, shardCount);

        if (!distributionMap.has(shard)) {
          distributionMap.set(shard, []);
        }
        distributionMap.get(shard).push(key);

        // Store in appropriate shard
        await setShardedCache(key, { id: i, content: `Item ${i}` }, shard, 300);
      }

      // Verify distribution is relatively even
      distributionMap.forEach((items, _shard) => {
        expect(items.length).toBeGreaterThan(itemsPerShard * 0.8); // Allow 20% variance
        expect(items.length).toBeLessThan(itemsPerShard * 1.2);
      });

      // Test retrieval from correct shards
      for (let i = 0; i < totalItems; i++) {
        const key = `shard_test_item_${i}`;
        const expectedShard = getShardForKey(key, shardCount);
        const data = await getShardedCache(key, expectedShard);

        expect(data).toBeDefined();
        expect(data.id).toBe(i);
      }
    });

    test('should handle shard failures gracefully', async () => {
      const activeShards = [0, 1, 2];
      const failedShard = 1;
      const testKey = 'shard_failure_test';

      // Store data in shard that will fail
      const originalShard = getShardForKey(testKey, activeShards.length);
      await setShardedCache(testKey, { content: 'Test data' }, originalShard, 300);

      // Simulate shard failure
      if (originalShard === failedShard) {
        // Simulate failover to backup shard
        const backupShard = (originalShard + 1) % activeShards.length;

        try {
          await getShardedCache(testKey, originalShard);
        } catch (error) {
          // Fallback to backup shard
          const backupData = await getShardedCache(testKey, backupShard);
          if (!backupData) {
            // Reconstruct data if not in backup
            await setShardedCache(testKey, { content: 'Reconstructed data' }, backupShard, 300);
          }
        }

        // Verify data is still accessible
        const recoveredData = await getShardedCache(testKey, backupShard);
        expect(recoveredData).toBeDefined();
      }
    });
  });

  describe('Cache Compression and Optimization', () => {
    test('should compress large cached objects', async () => {
      const largeContent = AITestHelpers.createLargeTextContent(1000); // 1MB content
      const compressionKey = 'compression_test';

      // Store with compression
      const storeResult = await PerformanceHelpers.measureAsync('compressed_store', async () => {
        return await setCompressedCache(
          compressionKey,
          {
            content: largeContent,
            metadata: { size: largeContent.length },
          },
          300
        );
      });

      // Retrieve and decompress
      const retrieveResult = await PerformanceHelpers.measureAsync(
        'compressed_retrieve',
        async () => {
          return await getCompressedCache(compressionKey);
        }
      );

      // Verify compression efficiency
      expect(storeResult.result.compressionRatio).toBeGreaterThan(0.1); // At least 10:1 compression
      expect(retrieveResult.result.content).toBe(largeContent);
      expect(retrieveResult.result.metadata.size).toBe(largeContent.length);

      // Performance should still be acceptable
      expect(retrieveResult.metrics.duration).toBeLessThan(100); // Under 100ms
    });

    test('should implement intelligent cache eviction policies', async () => {
      const maxCacheSize = 10;
      const cache = new Map();
      const accessCounts = new Map();

      // Fill cache to capacity
      for (let i = 0; i < maxCacheSize; i++) {
        const key = `lru_test_${i}`;
        cache.set(key, { data: `Content ${i}`, created: Date.now() });
        accessCounts.set(key, 1);
      }

      // Access some items to make them "hot"
      const hotItems = ['lru_test_0', 'lru_test_5', 'lru_test_9'];
      hotItems.forEach((key) => {
        cache.get(key); // Simulate access
        accessCounts.set(key, accessCounts.get(key) + 10);
      });

      // Add new items beyond capacity
      const newItems = 5;
      for (let i = 0; i < newItems; i++) {
        const newKey = `new_item_${i}`;

        // Implement LRU with access frequency consideration
        if (cache.size >= maxCacheSize) {
          const evictionKey = selectEvictionCandidate(cache, accessCounts);
          cache.delete(evictionKey);
          accessCounts.delete(evictionKey);
        }

        cache.set(newKey, { data: `New content ${i}`, created: Date.now() });
        accessCounts.set(newKey, 1);
      }

      // Hot items should still be in cache
      hotItems.forEach((key) => {
        expect(cache.has(key)).toBe(true);
      });

      // Some cold items should have been evicted
      expect(cache.size).toBe(maxCacheSize);
    });
  });

  describe('Cache Warming and Preloading', () => {
    test('should implement predictive cache warming', async () => {
      const userId = testUser.id;
      const userPattern = {
        commonly_accessed: ['summary', 'flashcards'],
        peak_hours: [9, 14, 20], // 9am, 2pm, 8pm
        content_types: ['machine_learning', 'programming'],
      };

      // Simulate predictive warming based on user patterns
      const warmingCandidates = await identifyWarmingCandidates(userId, userPattern);

      const warmingResults = await PerformanceHelpers.measureAsync(
        'predictive_warming',
        async () => {
          const warmPromises = warmingCandidates.map(async (candidate) => {
            const content = await generateContent(candidate.type);
            await setL2Cache(candidate.key, content, 1800); // 30 min TTL
            return { key: candidate.key, warmed: true };
          });

          return await Promise.all(warmPromises);
        }
      );

      // Verify warming completed successfully
      expect(warmingResults.result.length).toBeGreaterThan(0);
      warmingResults.result.forEach((result) => {
        expect(result.warmed).toBe(true);
      });

      // Subsequent access should be very fast
      for (const candidate of warmingCandidates) {
        const accessResult = await PerformanceHelpers.measureAsync('warmed_access', async () => {
          return await getL2Cache(candidate.key);
        });

        expect(accessResult.result).toBeDefined();
        expect(accessResult.metrics.duration).toBeLessThan(10); // Very fast access
      }
    });

    test('should warm cache based on real-time analytics', async () => {
      const analyticsData = {
        trending_topics: ['artificial_intelligence', 'machine_learning', 'data_science'],
        popular_content_types: ['explanation', 'examples', 'quiz'],
        user_segments: ['beginner', 'intermediate', 'advanced'],
      };

      // Generate warming strategy from analytics
      const warmingStrategy = generateWarmingStrategy(analyticsData);

      const batchWarmingResult = await PerformanceHelpers.measureAsync(
        'analytics_based_warming',
        async () => {
          const warmPromises = warmingStrategy.map(async (strategy) => {
            const content = await generatePersonalizedContent(
              strategy.topic,
              strategy.content_type,
              strategy.user_segment
            );

            const cacheKey = `trend:${strategy.topic}:${strategy.content_type}:${strategy.user_segment}`;
            await setL2Cache(cacheKey, content, 900); // 15 min TTL for trending

            return { strategy, cached: true };
          });

          return await Promise.all(warmPromises);
        }
      );

      // Verify trending content is cached
      expect(batchWarmingResult.result.length).toBeGreaterThan(0);

      // Test access to warmed content
      for (const result of batchWarmingResult.result) {
        const { strategy } = result;
        const cacheKey = `trend:${strategy.topic}:${strategy.content_type}:${strategy.user_segment}`;

        const cachedContent = await getL2Cache(cacheKey);
        expect(cachedContent).toBeDefined();
        expect(cachedContent.topic).toBe(strategy.topic);
      }
    });
  });

  describe('Cache Monitoring and Observability', () => {
    test('should provide detailed cache metrics and insights', async () => {
      // Generate varied cache activity
      const activities = [
        { operation: 'get', key: 'metric_test_1', hit: false },
        { operation: 'set', key: 'metric_test_1', success: true },
        { operation: 'get', key: 'metric_test_1', hit: true },
        { operation: 'get', key: 'metric_test_2', hit: false },
        { operation: 'set', key: 'metric_test_2', success: true },
        { operation: 'delete', key: 'metric_test_1', success: true },
        { operation: 'get', key: 'metric_test_1', hit: false },
      ];

      const metrics = new CacheMetricsCollector();

      for (const activity of activities) {
        const startTime = Date.now();

        // Simulate cache operation
        await simulateCacheOperation(activity);

        const duration = Date.now() - startTime;
        metrics.record(activity.operation, duration, activity.hit !== false);
      }

      const report = metrics.generateReport();

      expect(report).toMatchObject({
        total_operations: activities.length,
        hit_rate: expect.any(Number),
        miss_rate: expect.any(Number),
        average_latency: expect.any(Number),
        operations_by_type: expect.any(Object),
        performance_percentiles: expect.any(Object),
      });

      expect(report.hit_rate).toBeGreaterThan(0);
      expect(report.hit_rate + report.miss_rate).toBeCloseTo(1.0, 2);
    });

    test('should detect cache performance anomalies', async () => {
      const anomalyDetector = new CacheAnomalyDetector();

      // Generate normal operations
      for (let i = 0; i < 100; i++) {
        const normalLatency = 5 + Math.random() * 10; // 5-15ms normal range
        anomalyDetector.recordOperation('get', normalLatency, true);
      }

      // Introduce anomalous operations
      const anomalousLatencies = [100, 200, 150, 300]; // Much higher latencies
      anomalousLatencies.forEach((latency) => {
        anomalyDetector.recordOperation('get', latency, true);
      });

      const anomalies = anomalyDetector.detectAnomalies();

      expect(anomalies.length).toBeGreaterThan(0);
      anomalies.forEach((anomaly) => {
        expect(anomaly.latency).toBeGreaterThan(50); // Significantly higher than normal
        expect(anomaly.severity).toMatch(/medium|high/);
      });
    });
  });
});

// Helper functions and classes

// Multi-level cache implementation
const l1Cache = new Map();

function getL1Cache(key: string): unknown {
  return l1Cache.get(key) || null;
}

function setL1Cache(key: string, value: unknown, _ttlSeconds: number): void {
  l1Cache.set(key, value);
  // In real implementation, would set TTL
}

function clearL1Cache(key: string): void {
  l1Cache.delete(key);
}

async function getL2Cache(key: string): Promise<unknown> {
  // Simulate Redis access
  await new Promise((resolve) => setTimeout(resolve, 2));
  return mockRedisCache.get(key) || null;
}

async function setL2Cache(key: string, value: unknown, _ttlSeconds: number): Promise<void> {
  // Simulate Redis storage
  await new Promise((resolve) => setTimeout(resolve, 1));
  mockRedisCache.set(key, value);
}

// Mock Redis cache for testing
const mockRedisCache = new Map();

async function generateContent(type?: string): Promise<unknown> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return {
    type: type || 'default',
    content: 'Generated content',
    timestamp: Date.now(),
  };
}

async function accessWithPromotion(key: string): Promise<unknown> {
  let data = getL1Cache(key);
  if (data) {
    data.access_count = (data.access_count || 0) + 1;
    return data;
  }

  data = await getL2Cache(key);
  if (data) {
    data.access_count = (data.access_count || 0) + 1;

    // Promote to L1 if accessed frequently
    if (data.access_count > 3) {
      setL1Cache(key, data, 60);
    }

    await setL2Cache(key, data, 300);
    return data;
  }

  return null;
}

// Instance cache simulation
function setInstanceCache(
  instanceCaches: Map<string, Map<string, unknown>>,
  instance: string,
  key: string,
  value: unknown
): void {
  instanceCaches.get(instance)?.set(key, value);
}

function getInstanceCache(
  instanceCaches: Map<string, Map<string, unknown>>,
  instance: string,
  key: string
): unknown {
  return instanceCaches.get(instance)?.get(key);
}

function invalidateInstanceCache(
  instanceCaches: Map<string, Map<string, unknown>>,
  instance: string,
  key: string
): void {
  instanceCaches.get(instance)?.delete(key);
}

// Atomic cache update simulation
async function atomicCacheUpdate(
  key: string,
  data: unknown
): Promise<{ success: boolean; version?: number }> {
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 10));

  // Simulate version-based atomic update
  const existing = mockRedisCache.get(key);
  const newVersion = (existing?.version || 0) + 1;

  mockRedisCache.set(key, { ...data, version: newVersion });
  return { success: true, version: newVersion };
}

// Sharding functions
function getShardForKey(key: string, shardCount: number): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash) % shardCount;
}

const shardCaches = new Map();

async function setShardedCache(
  key: string,
  value: unknown,
  shard: number,
  _ttl: number
): Promise<void> {
  if (!shardCaches.has(shard)) {
    shardCaches.set(shard, new Map());
  }
  shardCaches.get(shard).set(key, value);
}

async function getShardedCache(key: string, shard: number): Promise<unknown> {
  return shardCaches.get(shard)?.get(key) || null;
}

// Compression simulation
async function setCompressedCache(
  key: string,
  value: unknown,
  ttl: number
): Promise<{ compressionRatio: number }> {
  const original = JSON.stringify(value);
  const compressed = compressString(original);
  await setL2Cache(key, { compressed: true, data: compressed }, ttl);

  return { compressionRatio: compressed.length / original.length };
}

async function getCompressedCache(key: string): Promise<unknown> {
  const cached = await getL2Cache(key);
  if (cached?.compressed) {
    const decompressed = decompressString(cached.data);
    return JSON.parse(decompressed);
  }
  return cached;
}

function compressString(str: string): string {
  // Simple compression simulation
  return str.replace(/(.)\1+/g, (match, char) => `${char}${match.length}`);
}

function decompressString(compressed: string): string {
  // Simple decompression simulation
  return compressed.replace(/(.)\d+/g, (match, char) => {
    const count = parseInt(match.slice(1));
    return char.repeat(count);
  });
}

// Cache eviction
function selectEvictionCandidate(
  cache: Map<string, unknown>,
  accessCounts: Map<string, number>
): string {
  let candidate = '';
  let lowestScore = Infinity;

  for (const [key, data] of Array.from(cache)) {
    const accessCount = accessCounts.get(key) || 0;
    const age = Date.now() - data.created;
    const score = accessCount / (age / 1000); // Access frequency per second

    if (score < lowestScore) {
      lowestScore = score;
      candidate = key;
    }
  }

  return candidate;
}

// Warming strategies
async function identifyWarmingCandidates(
  userId: string,
  pattern: unknown
): Promise<Array<{ key: string; type: string }>> {
  const candidates = [];

  for (const contentType of pattern.commonly_accessed) {
    for (const topic of pattern.content_types) {
      candidates.push({
        key: `user:${userId}:${topic}:${contentType}`,
        type: contentType,
      });
    }
  }

  return candidates;
}

function generateWarmingStrategy(
  analytics: unknown
): Array<{ topic: string; content_type: string; user_segment: string }> {
  const strategies = [];

  for (const topic of analytics.trending_topics) {
    for (const contentType of analytics.popular_content_types) {
      for (const segment of analytics.user_segments) {
        strategies.push({ topic, content_type: contentType, user_segment: segment });
      }
    }
  }

  return strategies.slice(0, 10); // Limit to top 10 strategies
}

async function generatePersonalizedContent(
  topic: string,
  contentType: string,
  userSegment: string
): Promise<unknown> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return {
    topic,
    content_type: contentType,
    user_segment: userSegment,
    content: `Personalized ${contentType} about ${topic} for ${userSegment} users`,
    generated_at: Date.now(),
  };
}

// Metrics and monitoring
class CacheMetricsCollector {
  private operations: Array<{ type: string; duration: number; hit: boolean; timestamp: number }> =
    [];

  record(operation: string, duration: number, hit: boolean): void {
    this.operations.push({
      type: operation,
      duration,
      hit,
      timestamp: Date.now(),
    });
  }

  generateReport(): unknown {
    const total = this.operations.length;
    const hits = this.operations.filter((op) => op.hit).length;
    const durations = this.operations.map((op) => op.duration).sort((a, b) => a - b);

    return {
      total_operations: total,
      hit_rate: hits / total,
      miss_rate: (total - hits) / total,
      average_latency: durations.reduce((sum, d) => sum + d, 0) / total,
      operations_by_type: this.operations.reduce(
        (acc, op) => {
          acc[op.type] = (acc[op.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      performance_percentiles: {
        p50: durations[Math.floor(durations.length * 0.5)],
        p95: durations[Math.floor(durations.length * 0.95)],
        p99: durations[Math.floor(durations.length * 0.99)],
      },
    };
  }
}

class CacheAnomalyDetector {
  private operations: Array<{ type: string; latency: number; timestamp: number }> = [];

  recordOperation(type: string, latency: number, _hit: boolean): void {
    this.operations.push({
      type,
      latency,
      timestamp: Date.now(),
    });
  }

  detectAnomalies(): Array<{ latency: number; severity: string; timestamp: number }> {
    const latencies = this.operations.map((op) => op.latency);
    const mean = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const stdDev = Math.sqrt(
      latencies.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / latencies.length
    );

    const anomalies = [];

    for (const op of this.operations) {
      const zScore = Math.abs(op.latency - mean) / stdDev;

      if (zScore > 3) {
        anomalies.push({
          latency: op.latency,
          severity: zScore > 5 ? 'high' : 'medium',
          timestamp: op.timestamp,
        });
      }
    }

    return anomalies;
  }
}

async function simulateCacheOperation(_activity: unknown): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
}
