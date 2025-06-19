import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { TestDatabase, TestRedis, TestAPI, PerformanceTracker } from '../../utils/test-helpers';
import { testConfig } from '../../config/test.config';
import Redis from 'ioredis';

describe('Caching Integration Tests', () => {
  let db: TestDatabase;
  let redis: TestRedis;
  let api: TestAPI;
  let redisClient: Redis;
  let testData: { userId: string; courseId: string; moduleId: string };
  let authToken: string;

  beforeAll(async () => {
    db = new TestDatabase();
    redis = new TestRedis();
    api = new TestAPI();
    redisClient = new Redis(testConfig.redis.url);
    testData = await db.seed();
    authToken = 'test-auth-token';
  });

  afterAll(async () => {
    await db.cleanup();
    await redis.cleanup();
    await redis.disconnect();
    await redisClient.quit();
  });

  beforeEach(async () => {
    await redis.cleanup();
  });

  describe('AI Content Caching', () => {
    test('should cache AI-generated content', async () => {
      const tracker = new PerformanceTracker();
      
      // Create test file
      const fileResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          module_id: testData.moduleId,
          original_name: 'cache-test.txt',
          content: 'Test content for caching behavior',
          mime_type: 'text/plain',
        }),
      });
      
      const { id: fileId } = await fileResponse.json();
      
      // First request - should generate and cache
      tracker.start('first-request');
      const firstResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/ai/generate-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_id: fileId,
            content_type: 'summary',
          }),
        }
      );
      tracker.end('first-request');
      
      expect(firstResponse.status).toBe(200);
      const firstContent = await firstResponse.json();
      
      // Check cache headers
      expect(firstResponse.headers.get('X-Cache')).toBe('MISS');
      
      // Second request - should hit cache
      tracker.start('cached-request');
      const cachedResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/ai/generate-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_id: fileId,
            content_type: 'summary',
          }),
        }
      );
      tracker.end('cached-request');
      
      expect(cachedResponse.status).toBe(200);
      const cachedContent = await cachedResponse.json();
      
      // Verify cache hit
      expect(cachedResponse.headers.get('X-Cache')).toBe('HIT');
      expect(cachedContent.content).toBe(firstContent.content);
      
      // Performance comparison
      const report = tracker.getReport();
      expect(report['cached-request'].duration).toBeLessThan(
        report['first-request'].duration * 0.1
      );
    });

    test('should cache with persona-specific keys', async () => {
      const fileResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          module_id: testData.moduleId,
          original_name: 'persona-cache-test.txt',
          content: 'Content for persona caching test',
          mime_type: 'text/plain',
        }),
      });
      
      const { id: fileId } = await fileResponse.json();
      
      const personas = [
        { learning_style: 'visual', expertise_level: 'beginner' },
        { learning_style: 'analytical', expertise_level: 'expert' },
      ];
      
      // Generate content for different personas
      const responses = await Promise.all(
        personas.map(persona =>
          fetch(`${testConfig.api.baseUrl}/api/v1/ai/generate-content`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file_id: fileId,
              content_type: 'explanation',
              persona,
            }),
          })
        )
      );
      
      const contents = await Promise.all(responses.map(r => r.json()));
      
      // Contents should be different
      expect(contents[0].content).not.toBe(contents[1].content);
      
      // Request again with same personas - should hit cache
      const cachedResponses = await Promise.all(
        personas.map(persona =>
          fetch(`${testConfig.api.baseUrl}/api/v1/ai/generate-content`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file_id: fileId,
              content_type: 'explanation',
              persona,
            }),
          })
        )
      );
      
      // All should be cache hits
      cachedResponses.forEach(response => {
        expect(response.headers.get('X-Cache')).toBe('HIT');
      });
    });

    test('should invalidate cache on content update', async () => {
      const fileResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          module_id: testData.moduleId,
          original_name: 'invalidation-test.txt',
          content: 'Original content',
          mime_type: 'text/plain',
        }),
      });
      
      const { id: fileId } = await fileResponse.json();
      
      // Generate and cache content
      const firstResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/ai/generate-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_id: fileId,
            content_type: 'summary',
          }),
        }
      );
      
      expect(firstResponse.headers.get('X-Cache')).toBe('MISS');
      const firstContent = await firstResponse.json();
      
      // Update file content
      await fetch(`${testConfig.api.baseUrl}/api/v1/files/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: 'Updated content with new information',
        }),
      });
      
      // Request again - should regenerate
      const afterUpdateResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/ai/generate-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_id: fileId,
            content_type: 'summary',
          }),
        }
      );
      
      expect(afterUpdateResponse.headers.get('X-Cache')).toBe('MISS');
      const updatedContent = await afterUpdateResponse.json();
      
      // Content should be different
      expect(updatedContent.content).not.toBe(firstContent.content);
    });
  });

  describe('Search Results Caching', () => {
    test('should cache search results', async () => {
      const tracker = new PerformanceTracker();
      
      const searchQuery = {
        query: 'machine learning',
        course_id: testData.courseId,
        limit: 10,
      };
      
      // First search - no cache
      tracker.start('first-search');
      const firstResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchQuery),
        }
      );
      tracker.end('first-search');
      
      expect(firstResponse.status).toBe(200);
      const firstResults = await firstResponse.json();
      expect(firstResponse.headers.get('X-Cache')).toBe('MISS');
      
      // Second search - should hit cache
      tracker.start('cached-search');
      const cachedResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchQuery),
        }
      );
      tracker.end('cached-search');
      
      expect(cachedResponse.status).toBe(200);
      const cachedResults = await cachedResponse.json();
      expect(cachedResponse.headers.get('X-Cache')).toBe('HIT');
      
      // Results should match
      expect(cachedResults).toEqual(firstResults);
      
      // Performance improvement
      const report = tracker.getReport();
      expect(report['cached-search'].duration).toBeLessThan(
        report['first-search'].duration * 0.2
      );
    });

    test('should use different cache keys for different search parameters', async () => {
      const queries = [
        { query: 'python', limit: 10 },
        { query: 'python', limit: 20 },
        { query: 'javascript', limit: 10 },
      ];
      
      const responses = await Promise.all(
        queries.map(q =>
          fetch(`${testConfig.api.baseUrl}/api/v1/search`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(q),
          })
        )
      );
      
      // All should be cache misses
      responses.forEach(response => {
        expect(response.headers.get('X-Cache')).toBe('MISS');
      });
      
      // Request same queries again
      const cachedResponses = await Promise.all(
        queries.map(q =>
          fetch(`${testConfig.api.baseUrl}/api/v1/search`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(q),
          })
        )
      );
      
      // All should be cache hits
      cachedResponses.forEach(response => {
        expect(response.headers.get('X-Cache')).toBe('HIT');
      });
    });
  });

  describe('Dashboard Data Caching', () => {
    test('should cache dashboard statistics', async () => {
      const tracker = new PerformanceTracker();
      
      // First request
      tracker.start('first-dashboard');
      const firstResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/dashboard/stats`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }
      );
      tracker.end('first-dashboard');
      
      expect(firstResponse.status).toBe(200);
      const firstStats = await firstResponse.json();
      expect(firstResponse.headers.get('X-Cache')).toBe('MISS');
      
      // Second request
      tracker.start('cached-dashboard');
      const cachedResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/dashboard/stats`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }
      );
      tracker.end('cached-dashboard');
      
      expect(cachedResponse.status).toBe(200);
      const cachedStats = await cachedResponse.json();
      expect(cachedResponse.headers.get('X-Cache')).toBe('HIT');
      
      // Stats should match
      expect(cachedStats).toEqual(firstStats);
      
      // Performance check
      const report = tracker.getReport();
      expect(report['cached-dashboard'].duration).toBeLessThan(
        report['first-dashboard'].duration * 0.3
      );
    });

    test('should invalidate dashboard cache on data change', async () => {
      // Get initial stats
      const initialResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/dashboard/stats`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }
      );
      const initialStats = await initialResponse.json();
      
      // Create new course
      await fetch(`${testConfig.api.baseUrl}/api/v1/courses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Course for Cache Test',
          description: 'Testing cache invalidation',
        }),
      });
      
      // Get stats again
      const afterCreateResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/dashboard/stats`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }
      );
      
      expect(afterCreateResponse.headers.get('X-Cache')).toBe('MISS');
      const updatedStats = await afterCreateResponse.json();
      
      // Course count should increase
      expect(updatedStats.total_courses).toBe(initialStats.total_courses + 1);
    });
  });

  describe('Cache Expiration', () => {
    test('should respect TTL settings', async () => {
      // Create content with short TTL
      const response = await fetch(
        `${testConfig.api.baseUrl}/api/v1/ai/generate-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'X-Cache-TTL': '2', // 2 seconds
          },
          body: JSON.stringify({
            file_id: 'test-file-ttl',
            content_type: 'summary',
          }),
        }
      );
      
      expect(response.status).toBe(200);
      
      // Immediate request should hit cache
      const immediateResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/ai/generate-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_id: 'test-file-ttl',
            content_type: 'summary',
          }),
        }
      );
      
      expect(immediateResponse.headers.get('X-Cache')).toBe('HIT');
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Request after expiry should miss cache
      const expiredResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/ai/generate-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_id: 'test-file-ttl',
            content_type: 'summary',
          }),
        }
      );
      
      expect(expiredResponse.headers.get('X-Cache')).toBe('MISS');
    });
  });

  describe('Cache Warming', () => {
    test('should support cache warming for popular content', async () => {
      // Create multiple files
      const fileIds = [];
      for (let i = 0; i < 3; i++) {
        const response = await fetch(`${testConfig.api.baseUrl}/api/v1/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            module_id: testData.moduleId,
            original_name: `warm-cache-${i}.txt`,
            content: `Content for warming test ${i}`,
            mime_type: 'text/plain',
          }),
        });
        const { id } = await response.json();
        fileIds.push(id);
      }
      
      // Warm cache for all files
      const warmResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/admin/cache/warm`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_ids: fileIds,
            content_types: ['summary', 'flashcards'],
          }),
        }
      );
      
      expect(warmResponse.status).toBe(200);
      const warmResult = await warmResponse.json();
      expect(warmResult.warmed).toBe(fileIds.length * 2);
      
      // Verify all content is cached
      for (const fileId of fileIds) {
        for (const contentType of ['summary', 'flashcards']) {
          const response = await fetch(
            `${testConfig.api.baseUrl}/api/v1/ai/generate-content`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                file_id: fileId,
                content_type: contentType,
              }),
            }
          );
          
          expect(response.headers.get('X-Cache')).toBe('HIT');
        }
      }
    });
  });

  describe('Cache Statistics', () => {
    test('should track cache hit/miss rates', async () => {
      // Make several requests to build statistics
      const requests = 10;
      const fileId = 'stats-test-file';
      
      for (let i = 0; i < requests; i++) {
        await fetch(`${testConfig.api.baseUrl}/api/v1/ai/generate-content`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_id: `${fileId}-${i % 3}`, // Some will hit, some miss
            content_type: 'summary',
          }),
        });
      }
      
      // Get cache statistics
      const statsResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/admin/cache/stats`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` },
        }
      );
      
      expect(statsResponse.status).toBe(200);
      const stats = await statsResponse.json();
      
      expect(stats).toMatchObject({
        hits: expect.any(Number),
        misses: expect.any(Number),
        hit_rate: expect.any(Number),
        total_requests: expect.any(Number),
        memory_usage: expect.any(Number),
      });
      
      expect(stats.total_requests).toBeGreaterThanOrEqual(requests);
      expect(stats.hit_rate).toBeGreaterThanOrEqual(0);
      expect(stats.hit_rate).toBeLessThanOrEqual(1);
    });
  });
});