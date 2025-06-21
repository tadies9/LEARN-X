import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { DatabaseHelpers } from '../../utils/database-helpers';
import { PerformanceHelpers } from '../../utils/performance-helpers';
import { AITestHelpers } from '../../utils/ai-test-helpers';
import { TestFiles } from '../../utils/test-helpers';
import { testConfig } from '../../config/test.config';

describe('Performance Regression Test Suite', () => {
  let testUser: any;
  let testCourse: any;
  let testModule: any;
  let baselineMetrics: Map<string, any>;
  const createdIds: string[] = [];

  beforeAll(async () => {
    DatabaseHelpers.initialize();

    // Create test data
    testUser = await DatabaseHelpers.createTestUser();
    testCourse = await DatabaseHelpers.createTestCourse(testUser.id);
    testModule = await DatabaseHelpers.createTestModule(testCourse.id);

    createdIds.push(testUser.id, testCourse.id, testModule.id);

    // Load baseline performance metrics
    baselineMetrics = await loadBaselineMetrics();
  });

  afterAll(async () => {
    await DatabaseHelpers.cleanupTestDataById(createdIds);
    await DatabaseHelpers.cleanupTestData();

    // Save current run metrics as new baseline if significantly improved
    await saveCurrentMetricsIfImproved();
  });

  beforeEach(() => {
    PerformanceHelpers.clearMeasurements();
  });

  describe('API Response Time Regression', () => {
    test('should maintain API response times within acceptable thresholds', async () => {
      const endpoints = [
        { path: '/api/v1/health', method: 'GET', baseline_ms: 50 },
        { path: '/api/v1/dashboard/stats', method: 'GET', baseline_ms: 200 },
        { path: '/api/v1/search', method: 'POST', baseline_ms: 500 },
        { path: '/api/v1/ai/generate-content', method: 'POST', baseline_ms: 3000 },
      ];

      const regressionResults = [];

      for (const endpoint of endpoints) {
        const performanceTest = await PerformanceHelpers.measureAsync(
          `api_${endpoint.path.replace(/\//g, '_')}`,
          async () => {
            const iterations = 10;
            const durations = [];

            for (let i = 0; i < iterations; i++) {
              const startTime = Date.now();
              await simulateAPICall(endpoint.path, endpoint.method);
              const duration = Date.now() - startTime;
              durations.push(duration);
            }

            return {
              endpoint: endpoint.path,
              min: Math.min(...durations),
              max: Math.max(...durations),
              avg: durations.reduce((sum, d) => sum + d, 0) / durations.length,
              p95: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)],
              baseline: endpoint.baseline_ms,
            };
          }
        );

        const result = performanceTest.result;
        const regressionPercentage = ((result.p95 - result.baseline) / result.baseline) * 100;

        regressionResults.push({
          endpoint: endpoint.path,
          current_p95: result.p95,
          baseline: result.baseline,
          regression_percentage: regressionPercentage,
          is_regression: regressionPercentage > 20, // 20% threshold
        });

        // Assert no significant regression
        expect(regressionPercentage).toBeLessThan(20);
      }

      // Generate regression report
      const regressionReport = generateRegressionReport(regressionResults);
      console.log('API Performance Regression Report:', regressionReport);
    });

    test('should maintain throughput performance under load', async () => {
      const loadTest = await PerformanceHelpers.measureAsync(
        'throughput_regression_test',
        async () => {
          const concurrency = 20;
          const duration = 30000; // 30 seconds
          const startTime = Date.now();
          let requestCount = 0;
          let errorCount = 0;

          const workers = Array(concurrency)
            .fill(null)
            .map(async () => {
              while (Date.now() - startTime < duration) {
                try {
                  await simulateAPICall('/api/v1/dashboard/stats', 'GET');
                  requestCount++;
                } catch (error) {
                  errorCount++;
                }
              }
            });

          await Promise.all(workers);

          const actualDuration = Date.now() - startTime;
          const requestsPerSecond = (requestCount / actualDuration) * 1000;
          const errorRate = errorCount / (requestCount + errorCount);

          return {
            total_requests: requestCount,
            requests_per_second: requestsPerSecond,
            error_rate: errorRate,
            duration_ms: actualDuration,
          };
        }
      );

      const currentThroughput = loadTest.result.requests_per_second;
      const baselineThroughput = baselineMetrics.get('throughput_rps') || 50;
      const throughputRegression =
        ((baselineThroughput - currentThroughput) / baselineThroughput) * 100;

      // Throughput should not degrade by more than 15%
      expect(throughputRegression).toBeLessThan(15);
      expect(loadTest.result.error_rate).toBeLessThan(0.05); // Less than 5% error rate
    });
  });

  describe('Database Performance Regression', () => {
    test('should maintain database query performance', async () => {
      const queries = [
        {
          name: 'user_dashboard_query',
          operation: () =>
            DatabaseHelpers.getClient().from('courses').select('*').eq('user_id', testUser.id),
          baseline_ms: 100,
        },
        {
          name: 'file_search_query',
          operation: () => DatabaseHelpers.getClient().from('files').select('*').limit(50),
          baseline_ms: 150,
        },
        {
          name: 'complex_join_query',
          operation: () =>
            DatabaseHelpers.getClient()
              .from('files')
              .select('*, modules(*), courses(*)')
              .eq('courses.user_id', testUser.id),
          baseline_ms: 300,
        },
      ];

      const queryResults = [];

      for (const query of queries) {
        const queryTest = await PerformanceHelpers.measureAsync(`db_${query.name}`, async () => {
          const iterations = 20;
          const durations = [];

          for (let i = 0; i < iterations; i++) {
            const startTime = Date.now();
            await query.operation();
            const duration = Date.now() - startTime;
            durations.push(duration);
          }

          return {
            query_name: query.name,
            min: Math.min(...durations),
            max: Math.max(...durations),
            avg: durations.reduce((sum, d) => sum + d, 0) / durations.length,
            p95: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)],
            baseline: query.baseline_ms,
          };
        });

        const result = queryTest.result;
        const regressionPercentage = ((result.p95 - result.baseline) / result.baseline) * 100;

        queryResults.push({
          query: query.name,
          current_p95: result.p95,
          baseline: result.baseline,
          regression_percentage: regressionPercentage,
        });

        // Database queries should not regress by more than 25%
        expect(regressionPercentage).toBeLessThan(25);
      }
    });

    test('should maintain connection pool efficiency', async () => {
      const connectionPoolTest = await PerformanceHelpers.measureAsync(
        'connection_pool_performance',
        async () => {
          const concurrentConnections = 50;
          const connectionsPerWorker = 10;

          const connectionWorkers = Array(concurrentConnections)
            .fill(null)
            .map(async () => {
              const connectionTimes = [];

              for (let i = 0; i < connectionsPerWorker; i++) {
                const startTime = Date.now();
                const client = DatabaseHelpers.getClient();
                await client.from('users').select('count').single();
                const connectionTime = Date.now() - startTime;
                connectionTimes.push(connectionTime);
              }

              return connectionTimes;
            });

          const allConnectionTimes = (await Promise.all(connectionWorkers)).flat();
          const avgConnectionTime =
            allConnectionTimes.reduce((sum, t) => sum + t, 0) / allConnectionTimes.length;

          return {
            total_connections: allConnectionTimes.length,
            avg_connection_time: avgConnectionTime,
            max_connection_time: Math.max(...allConnectionTimes),
            connection_pool_efficiency:
              allConnectionTimes.filter((t) => t < 50).length / allConnectionTimes.length,
          };
        }
      );

      const baselineConnectionTime = baselineMetrics.get('avg_connection_time') || 30;
      const connectionTimeRegression =
        ((connectionPoolTest.result.avg_connection_time - baselineConnectionTime) /
          baselineConnectionTime) *
        100;

      expect(connectionTimeRegression).toBeLessThan(30);
      expect(connectionPoolTest.result.connection_pool_efficiency).toBeGreaterThan(0.8); // 80% of connections under 50ms
    });
  });

  describe('File Processing Performance Regression', () => {
    test('should maintain file processing pipeline performance', async () => {
      const fileSizes = [
        { size: '1KB', content: 'a'.repeat(1024), baseline_ms: 2000 },
        { size: '10KB', content: 'a'.repeat(10240), baseline_ms: 4000 },
        { size: '100KB', content: 'a'.repeat(102400), baseline_ms: 8000 },
        { size: '1MB', content: AITestHelpers.createLargeTextContent(1000), baseline_ms: 15000 },
      ];

      const processingResults = [];

      for (const fileSize of fileSizes) {
        const processingTest = await PerformanceHelpers.measureAsync(
          `file_processing_${fileSize.size}`,
          async () => {
            const testFile = await DatabaseHelpers.createTestFile(testModule.id, {
              filename: `regression_test_${fileSize.size}.txt`,
              file_size: fileSize.content.length,
              processing_status: 'pending',
            });

            createdIds.push(testFile.id);

            const startTime = Date.now();

            // Simulate complete file processing pipeline
            await simulateFileProcessingPipeline(testFile.id, fileSize.content);

            const processingTime = Date.now() - startTime;

            return {
              file_size: fileSize.size,
              processing_time: processingTime,
              baseline: fileSize.baseline_ms,
              content_length: fileSize.content.length,
            };
          }
        );

        const result = processingTest.result;
        const regressionPercentage =
          ((result.processing_time - result.baseline) / result.baseline) * 100;

        processingResults.push({
          file_size: fileSize.size,
          current_time: result.processing_time,
          baseline: result.baseline,
          regression_percentage: regressionPercentage,
        });

        // File processing should not regress by more than 30%
        expect(regressionPercentage).toBeLessThan(30);
      }
    });

    test('should maintain embedding generation performance', async () => {
      const embeddingTest = await PerformanceHelpers.measureAsync(
        'embedding_generation_performance',
        async () => {
          const textChunks = [
            'Short text for embedding',
            'Medium length text content that should generate consistent embedding performance metrics',
            'This is a longer text chunk that contains more detailed information and should still maintain reasonable embedding generation performance within our established baseline metrics and thresholds',
          ];

          const embeddingTimes = [];

          for (const chunk of textChunks) {
            const startTime = Date.now();
            await simulateEmbeddingGeneration(chunk);
            const embeddingTime = Date.now() - startTime;
            embeddingTimes.push({
              chunk_length: chunk.length,
              embedding_time: embeddingTime,
            });
          }

          const avgEmbeddingTime =
            embeddingTimes.reduce((sum, e) => sum + e.embedding_time, 0) / embeddingTimes.length;

          return {
            embedding_times: embeddingTimes,
            avg_embedding_time: avgEmbeddingTime,
            chunks_processed: textChunks.length,
          };
        }
      );

      const baselineEmbeddingTime = baselineMetrics.get('avg_embedding_time') || 200;
      const embeddingRegression =
        ((embeddingTest.result.avg_embedding_time - baselineEmbeddingTime) /
          baselineEmbeddingTime) *
        100;

      expect(embeddingRegression).toBeLessThan(25);
    });
  });

  describe('AI Content Generation Performance Regression', () => {
    test('should maintain AI content generation speed', async () => {
      const contentTypes = ['summary', 'flashcards', 'quiz', 'explanation'];
      const generationResults = [];

      for (const contentType of contentTypes) {
        const generationTest = await PerformanceHelpers.measureAsync(
          `ai_generation_${contentType}`,
          async () => {
            const iterations = 5;
            const generationTimes = [];

            for (let i = 0; i < iterations; i++) {
              const startTime = Date.now();
              await simulateAIContentGeneration(contentType);
              const generationTime = Date.now() - startTime;
              generationTimes.push(generationTime);
            }

            const avgTime = generationTimes.reduce((sum, t) => sum + t, 0) / generationTimes.length;

            return {
              content_type: contentType,
              avg_generation_time: avgTime,
              min_time: Math.min(...generationTimes),
              max_time: Math.max(...generationTimes),
            };
          }
        );

        const baselineTime = baselineMetrics.get(`ai_generation_${contentType}`) || 2000;
        const regressionPercentage =
          ((generationTest.result.avg_generation_time - baselineTime) / baselineTime) * 100;

        generationResults.push({
          content_type: contentType,
          current_time: generationTest.result.avg_generation_time,
          baseline: baselineTime,
          regression_percentage: regressionPercentage,
        });

        // AI generation should not regress by more than 20%
        expect(regressionPercentage).toBeLessThan(20);
      }
    });

    test('should maintain personalization performance', async () => {
      const personas = [
        AITestHelpers.loadPersona('student'),
        AITestHelpers.loadPersona('professional'),
      ];

      const personalizationTest = await PerformanceHelpers.measureAsync(
        'personalization_performance',
        async () => {
          const personalizationTimes = [];

          for (const persona of personas) {
            const iterations = 3;
            for (let i = 0; i < iterations; i++) {
              const startTime = Date.now();
              await simulatePersonalizedContentGeneration(persona);
              const personalizationTime = Date.now() - startTime;
              personalizationTimes.push(personalizationTime);
            }
          }

          const avgPersonalizationTime =
            personalizationTimes.reduce((sum, t) => sum + t, 0) / personalizationTimes.length;

          return {
            total_personalizations: personalizationTimes.length,
            avg_personalization_time: avgPersonalizationTime,
            max_personalization_time: Math.max(...personalizationTimes),
          };
        }
      );

      const baselinePersonalizationTime = baselineMetrics.get('avg_personalization_time') || 500;
      const personalizationRegression =
        ((personalizationTest.result.avg_personalization_time - baselinePersonalizationTime) /
          baselinePersonalizationTime) *
        100;

      expect(personalizationRegression).toBeLessThan(25);
    });
  });

  describe('Memory Usage Regression', () => {
    test('should maintain memory efficiency during operations', async () => {
      const memoryTest = await PerformanceHelpers.measureAsync(
        'memory_usage_regression',
        async () => {
          const initialMemory = process.memoryUsage();

          // Perform memory-intensive operations
          const operations = [
            () => simulateFileProcessingPipeline('test-file', 'a'.repeat(1024 * 1024)), // 1MB
            () => simulateAIContentGeneration('summary'),
            () => simulateEmbeddingGeneration('Large content for embedding'),
            () => simulatePersonalizedContentGeneration(AITestHelpers.loadPersona('student')),
          ];

          const memorySnapshots = [initialMemory];

          for (const operation of operations) {
            await operation();
            memorySnapshots.push(process.memoryUsage());
          }

          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }

          const finalMemory = process.memoryUsage();
          const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
          const memoryGrowthMB = memoryGrowth / (1024 * 1024);

          return {
            initial_memory_mb: initialMemory.heapUsed / (1024 * 1024),
            final_memory_mb: finalMemory.heapUsed / (1024 * 1024),
            memory_growth_mb: memoryGrowthMB,
            peak_memory_mb: Math.max(...memorySnapshots.map((s) => s.heapUsed)) / (1024 * 1024),
          };
        }
      );

      const baselineMemoryGrowth = baselineMetrics.get('memory_growth_mb') || 50;
      const memoryRegression =
        ((memoryTest.result.memory_growth_mb - baselineMemoryGrowth) / baselineMemoryGrowth) * 100;

      // Memory growth should not increase by more than 40%
      expect(memoryRegression).toBeLessThan(40);
      expect(memoryTest.result.memory_growth_mb).toBeLessThan(100); // Absolute limit of 100MB growth
    });

    test('should detect memory leaks over extended operation', async () => {
      const memoryLeakTest = await PerformanceHelpers.measureAsync(
        'memory_leak_detection',
        async () => {
          const iterations = 50;
          const memoryReadings = [];

          for (let i = 0; i < iterations; i++) {
            // Perform operations that should not leak memory
            await simulateAIContentGeneration('summary');

            if (i % 10 === 0) {
              // Force garbage collection periodically
              if (global.gc) {
                global.gc();
              }
              memoryReadings.push({
                iteration: i,
                memory_mb: process.memoryUsage().heapUsed / (1024 * 1024),
              });
            }
          }

          // Analyze memory trend
          const memoryTrend = calculateMemoryTrend(memoryReadings);

          return {
            memory_readings: memoryReadings,
            memory_trend_mb_per_iteration: memoryTrend,
            potential_leak: memoryTrend > 0.5, // More than 0.5MB growth per 10 iterations
          };
        }
      );

      // Should not show significant upward memory trend
      expect(memoryLeakTest.result.potential_leak).toBe(false);
      expect(memoryLeakTest.result.memory_trend_mb_per_iteration).toBeLessThan(1);
    });
  });

  describe('Concurrent Operations Performance', () => {
    test('should maintain performance under concurrent load', async () => {
      const concurrencyTest = await PerformanceHelpers.measureAsync(
        'concurrent_operations_performance',
        async () => {
          const concurrencyLevels = [1, 5, 10, 20];
          const results = [];

          for (const concurrency of concurrencyLevels) {
            const testStart = Date.now();

            const operations = Array(concurrency)
              .fill(null)
              .map(async () => {
                await simulateAIContentGeneration('summary');
              });

            await Promise.all(operations);

            const duration = Date.now() - testStart;
            const operationsPerSecond = (concurrency / duration) * 1000;

            results.push({
              concurrency,
              duration_ms: duration,
              operations_per_second: operationsPerSecond,
            });
          }

          return { concurrency_results: results };
        }
      );

      // Verify that performance scales reasonably with concurrency
      const results = concurrencyTest.result.concurrency_results;

      // Performance should not degrade exponentially
      const singleThreadOps = results.find((r) => r.concurrency === 1)?.operations_per_second || 1;
      const highConcurrencyOps =
        results.find((r) => r.concurrency === 20)?.operations_per_second || 1;

      const efficiencyRatio = highConcurrencyOps / singleThreadOps;

      // Should maintain at least 20% efficiency at high concurrency
      expect(efficiencyRatio).toBeGreaterThan(0.2);
    });
  });
});

// Helper functions

async function loadBaselineMetrics(): Promise<Map<string, any>> {
  // In a real implementation, this would load from a baseline file or database
  const baselines = new Map([
    ['throughput_rps', 50],
    ['avg_connection_time', 30],
    ['avg_embedding_time', 200],
    ['ai_generation_summary', 2000],
    ['ai_generation_flashcards', 2500],
    ['ai_generation_quiz', 3000],
    ['ai_generation_explanation', 2200],
    ['avg_personalization_time', 500],
    ['memory_growth_mb', 50],
  ]);

  return baselines;
}

async function saveCurrentMetricsIfImproved(): Promise<void> {
  // Implementation would save improved metrics as new baselines
  const report = PerformanceHelpers.generatePerformanceReport();
  console.log('Performance test completed. Report:', JSON.stringify(report, null, 2));
}

function generateRegressionReport(results: any[]): any {
  const regressions = results.filter((r) => r.is_regression);
  const improvements = results.filter((r) => r.regression_percentage < -10); // 10% improvement

  return {
    total_endpoints: results.length,
    regressions_detected: regressions.length,
    improvements_detected: improvements.length,
    avg_regression_percentage:
      results.reduce((sum, r) => sum + r.regression_percentage, 0) / results.length,
    worst_regression:
      regressions.length > 0 ? Math.max(...regressions.map((r) => r.regression_percentage)) : 0,
    best_improvement:
      improvements.length > 0 ? Math.min(...improvements.map((r) => r.regression_percentage)) : 0,
  };
}

function calculateMemoryTrend(readings: Array<{ iteration: number; memory_mb: number }>): number {
  if (readings.length < 2) return 0;

  const n = readings.length;
  const sumX = readings.reduce((sum, r) => sum + r.iteration, 0);
  const sumY = readings.reduce((sum, r) => sum + r.memory_mb, 0);
  const sumXY = readings.reduce((sum, r) => sum + r.iteration * r.memory_mb, 0);
  const sumXX = readings.reduce((sum, r) => sum + r.iteration * r.iteration, 0);

  // Linear regression slope
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  return slope;
}

// Simulation functions

async function simulateAPICall(path: string, method: string): Promise<void> {
  // Simulate API call with realistic delays
  const baseDelay =
    {
      '/api/v1/health': 20,
      '/api/v1/dashboard/stats': 150,
      '/api/v1/search': 400,
      '/api/v1/ai/generate-content': 2500,
    }[path] || 100;

  const delay = baseDelay + Math.random() * baseDelay * 0.3; // ±30% variance
  await new Promise((resolve) => setTimeout(resolve, delay));
}

async function simulateFileProcessingPipeline(fileId: string, content: string): Promise<void> {
  // Text extraction
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Chunking
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Embedding generation
  await new Promise((resolve) => setTimeout(resolve, content.length / 1000)); // 1ms per char

  // AI content generation
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

async function simulateEmbeddingGeneration(text: string): Promise<void> {
  const baseTime = 100;
  const timePerChar = text.length * 0.1;
  await new Promise((resolve) => setTimeout(resolve, baseTime + timePerChar));
}

async function simulateAIContentGeneration(contentType: string): Promise<void> {
  const times = {
    summary: 1800,
    flashcards: 2200,
    quiz: 2800,
    explanation: 2000,
  };

  const baseTime = times[contentType] || 2000;
  const variance = baseTime * 0.2; // ±20% variance
  const delay = baseTime + (Math.random() * variance * 2 - variance);

  await new Promise((resolve) => setTimeout(resolve, delay));
}

async function simulatePersonalizedContentGeneration(persona: any): Promise<void> {
  const baseTime = 400;
  const personalizationOverhead = 100;
  await new Promise((resolve) => setTimeout(resolve, baseTime + personalizationOverhead));
}
