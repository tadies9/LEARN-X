import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  TestDatabase,
  TestRedis,
  TestAPI,
  waitForCondition,
  PerformanceTracker,
} from '../../utils/test-helpers';
import { testConfig } from '../../config/test.config';
import { createClient } from '@supabase/supabase-js';

describe('Queue Processing Integration Tests', () => {
  let db: TestDatabase;
  let redis: TestRedis;
  let api: TestAPI;
  let testData: { userId: string; courseId: string; moduleId: string };
  let authToken: string;
  let _supabase: unknown;

  beforeAll(async () => {
    db = new TestDatabase();
    redis = new TestRedis();
    api = new TestAPI();
    testData = await db.seed();
    authToken = 'test-auth-token';

    const supabaseUrl = process.env.SUPABASE_URL || process.env.TEST_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_KEY || process.env.TEST_SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not found in environment variables');
    }

    _supabase = createClient(supabaseUrl, supabaseServiceKey);
  });

  afterAll(async () => {
    await db.cleanup();
    await redis.cleanup();
    await redis.disconnect();
  });

  beforeEach(async () => {
    // Clean up any stuck jobs
    await fetch(`${testConfig.api.baseUrl}/api/v1/admin/queue/purge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
  });

  describe('PGMQ Queue Operations', () => {
    test('should enqueue and process file processing job', async () => {
      const tracker = new PerformanceTracker();

      // Create a file
      const fileResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          module_id: testData.moduleId,
          original_name: 'queue-test.txt',
          content: 'Content for queue processing test',
          mime_type: 'text/plain',
        }),
      });

      const { id: fileId } = await fileResponse.json();

      tracker.start('job-enqueue');

      // Enqueue processing job
      const enqueueResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/queue/enqueue`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queue: 'file_processing',
          payload: {
            file_id: fileId,
            user_id: testData.userId,
            operation: 'process_file',
          },
        }),
      });

      tracker.end('job-enqueue');

      expect(enqueueResponse.status).toBe(200);
      const { job_id } = await enqueueResponse.json();
      expect(job_id).toBeDefined();

      tracker.start('job-processing');

      // Wait for job to be processed
      await waitForCondition(async () => {
        const statusResponse = await fetch(
          `${testConfig.api.baseUrl}/api/v1/queue/job/${job_id}/status`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        const status = await statusResponse.json();
        return status.status === 'completed';
      }, 30000);

      tracker.end('job-processing');

      // Verify file was processed
      const fileStatusResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/files/${fileId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const fileData = await fileStatusResponse.json();
      expect(fileData.processing_status).toBe('completed');

      // Performance checks
      const report = tracker.getReport();
      expect(report['job-enqueue'].duration).toBeLessThan(100);
      expect(report['job-processing'].duration).toBeLessThan(10000);
    });

    test('should handle job priorities correctly', async () => {
      const jobs = [];

      // Enqueue jobs with different priorities
      const priorities = ['low', 'normal', 'high'];
      for (const priority of priorities) {
        const response = await fetch(`${testConfig.api.baseUrl}/api/v1/queue/enqueue`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            queue: 'file_processing',
            payload: {
              test: true,
              priority,
            },
            priority,
          }),
        });

        const { job_id } = await response.json();
        jobs.push({ job_id, priority });
      }

      // Get queue status
      const statusResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/queue/status`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const queueStatus = await statusResponse.json();
      expect(queueStatus.file_processing.pending).toBeGreaterThanOrEqual(3);

      // High priority jobs should be processed first
      // Check job order in queue
      const queueResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/queue/peek/file_processing`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const nextJobs = await queueResponse.json();
      expect(nextJobs[0].payload.priority).toBe('high');
    });

    test('should handle job retries on failure', async () => {
      // Enqueue a job that will fail
      const enqueueResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/queue/enqueue`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queue: 'file_processing',
          payload: {
            file_id: 'non-existent-file',
            force_error: true,
          },
          max_retries: 3,
        }),
      });

      const { job_id } = await enqueueResponse.json();

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check job status
      const statusResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/queue/job/${job_id}/status`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const status = await statusResponse.json();
      expect(status.retry_count).toBeGreaterThan(0);
      expect(status.retry_count).toBeLessThanOrEqual(3);
    });

    test('should handle dead letter queue', async () => {
      // Enqueue a job that will fail permanently
      const enqueueResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/queue/enqueue`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queue: 'file_processing',
          payload: {
            permanent_failure: true,
          },
          max_retries: 1,
        }),
      });

      const { job_id } = await enqueueResponse.json();

      // Wait for job to fail and move to DLQ
      await waitForCondition(async () => {
        const dlqResponse = await fetch(
          `${testConfig.api.baseUrl}/api/v1/queue/dlq/file_processing`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        const dlqJobs = await dlqResponse.json();
        return dlqJobs.some((job: unknown) => (job as { id: string }).id === job_id);
      }, 10000);

      // Verify job is in DLQ
      const dlqResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/queue/dlq/file_processing`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      const dlqJobs = await dlqResponse.json();
      const failedJob = dlqJobs.find((job: unknown) => (job as { id: string }).id === job_id);
      expect(failedJob).toBeDefined();
      expect(failedJob.error).toBeDefined();
    });
  });

  describe('Queue-Worker Coordination', () => {
    test('should coordinate between Node and Python workers', async () => {
      // Upload a file that requires both Node and Python processing
      const fileContent = Buffer.from('Complex document requiring AI processing');
      const uploadResponse = await api.uploadFile(
        fileContent,
        'complex-doc.txt',
        testData.moduleId,
        authToken
      );

      const { file_id } = await uploadResponse.json();

      // Track processing stages
      const stages: string[] = [];
      const _checkCount = 0;

      await waitForCondition(async () => {
        const statusResponse = await fetch(
          `${testConfig.api.baseUrl}/api/v1/files/${file_id}/processing-log`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );

        const log = await statusResponse.json();

        // Track unique stages
        log.forEach((entry: unknown) => {
          if (!stages.includes(entry.stage)) {
            stages.push(entry.stage);
          }
        });

        checkCount++;

        // Should have both Node and Python processing stages
        return (
          stages.includes('text_extraction') &&
          stages.includes('embedding_generation') &&
          stages.includes('ai_content_generation')
        );
      }, 30000);

      // Verify cross-worker communication
      expect(stages).toContain('text_extraction'); // Node
      expect(stages).toContain('embedding_generation'); // Python
      expect(stages).toContain('ai_content_generation'); // Python
    });

    test('should handle worker failures gracefully', async () => {
      // Simulate Python worker being down
      await fetch(`${testConfig.api.baseUrl}/api/v1/admin/workers/python/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      // Try to process a file
      const fileContent = Buffer.from('Test content');
      const uploadResponse = await api.uploadFile(
        fileContent,
        'worker-failure-test.txt',
        testData.moduleId,
        authToken
      );

      const { file_id } = await uploadResponse.json();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check status - should be queued or retrying
      const statusResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/files/${file_id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const fileData = await statusResponse.json();
      expect(['processing', 'queued', 'retrying']).toContain(fileData.processing_status);

      // Restart Python worker
      await fetch(`${testConfig.api.baseUrl}/api/v1/admin/workers/python/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      // Should eventually complete
      await waitForCondition(async () => {
        const response = await fetch(`${testConfig.api.baseUrl}/api/v1/files/${file_id}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await response.json();
        return data.processing_status === 'completed';
      }, 30000);
    });
  });

  describe('Batch Queue Processing', () => {
    test('should process multiple files in batch efficiently', async () => {
      const tracker = new PerformanceTracker();
      const fileCount = 10;
      const fileIds = [];

      // Create multiple files
      for (let i = 0; i < fileCount; i++) {
        const response = await fetch(`${testConfig.api.baseUrl}/api/v1/files`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            module_id: testData.moduleId,
            original_name: `batch-file-${i}.txt`,
            content: `Content for batch processing test ${i}`,
            mime_type: 'text/plain',
          }),
        });
        const { id } = await response.json();
        fileIds.push(id);
      }

      tracker.start('batch-enqueue');

      // Enqueue batch job
      const batchResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/queue/batch/enqueue`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queue: 'file_processing',
          jobs: fileIds.map((id) => ({
            payload: {
              file_id: id,
              user_id: testData.userId,
            },
          })),
        }),
      });

      tracker.end('batch-enqueue');

      expect(batchResponse.status).toBe(200);
      const { batch_id, job_ids } = await batchResponse.json();
      expect(job_ids.length).toBe(fileCount);

      tracker.start('batch-processing');

      // Wait for batch to complete
      await waitForCondition(async () => {
        const statusResponse = await fetch(
          `${testConfig.api.baseUrl}/api/v1/queue/batch/${batch_id}/status`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        const status = await statusResponse.json();
        return status.completed === fileCount;
      }, 60000);

      tracker.end('batch-processing');

      // Verify all files processed
      const fileStatuses = await Promise.all(
        fileIds.map((id) =>
          fetch(`${testConfig.api.baseUrl}/api/v1/files/${id}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          }).then((r) => r.json())
        )
      );

      fileStatuses.forEach((file) => {
        expect(file.processing_status).toBe('completed');
      });

      // Performance check - batch should be more efficient
      const report = tracker.getReport();
      const avgTimePerFile = report['batch-processing'].duration / fileCount;
      expect(avgTimePerFile).toBeLessThan(2000); // Less than 2s per file
    });
  });

  describe('Queue Monitoring and Health', () => {
    test('should provide accurate queue metrics', async () => {
      // Enqueue various jobs
      const queues = ['file_processing', 'embedding_generation', 'notification'];
      const jobs = [];

      for (const queue of queues) {
        for (let i = 0; i < 3; i++) {
          const response = await fetch(`${testConfig.api.baseUrl}/api/v1/queue/enqueue`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              queue,
              payload: { test: true, index: i },
            }),
          });
          const { job_id } = await response.json();
          jobs.push({ queue, job_id });
        }
      }

      // Get queue metrics
      const metricsResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/queue/metrics`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(metricsResponse.status).toBe(200);
      const metrics = await metricsResponse.json();

      expect(metrics).toMatchObject({
        queues: expect.objectContaining({
          file_processing: expect.objectContaining({
            pending: expect.any(Number),
            processing: expect.any(Number),
            completed: expect.any(Number),
            failed: expect.any(Number),
            avg_processing_time: expect.any(Number),
          }),
        }),
        system: expect.objectContaining({
          total_jobs: expect.any(Number),
          jobs_per_minute: expect.any(Number),
          success_rate: expect.any(Number),
        }),
      });
    });

    test('should detect and report stuck jobs', async () => {
      // Create a job that will get stuck
      const enqueueResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/queue/enqueue`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queue: 'file_processing',
          payload: {
            simulate_stuck: true,
            processing_time: 60000, // 60 seconds
          },
        }),
      });

      const { job_id } = await enqueueResponse.json();

      // Wait for job to be considered stuck
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check health status
      const healthResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/queue/health`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const health = await healthResponse.json();
      expect(health.issues).toBeDefined();

      const stuckJobsIssue = health.issues.find((issue: unknown) => issue.type === 'stuck_jobs');
      expect(stuckJobsIssue).toBeDefined();
      expect(stuckJobsIssue.affected_jobs).toContain(job_id);
    });
  });

  describe('Queue Cleanup and Maintenance', () => {
    test('should clean up completed jobs after retention period', async () => {
      // Create and complete a job
      const enqueueResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/queue/enqueue`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          queue: 'file_processing',
          payload: { quick_job: true },
          retention: 2, // 2 seconds
        }),
      });

      const { job_id } = await enqueueResponse.json();

      // Wait for job to complete
      await waitForCondition(async () => {
        const statusResponse = await fetch(
          `${testConfig.api.baseUrl}/api/v1/queue/job/${job_id}/status`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        const status = await statusResponse.json();
        return status.status === 'completed';
      });

      // Job should exist immediately after completion
      const immediateResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/queue/job/${job_id}/status`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      expect(immediateResponse.status).toBe(200);

      // Wait for retention period
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Run cleanup
      await fetch(`${testConfig.api.baseUrl}/api/v1/queue/cleanup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      // Job should be cleaned up
      const afterCleanupResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/queue/job/${job_id}/status`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      expect(afterCleanupResponse.status).toBe(404);
    });

    test('should vacuum queue tables for performance', async () => {
      // Get initial queue stats
      const initialStatsResponse = await fetch(
        `${testConfig.api.baseUrl}/api/v1/admin/queue/stats`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      const _initialStats = await initialStatsResponse.json();

      // Run vacuum operation
      const vacuumResponse = await fetch(`${testConfig.api.baseUrl}/api/v1/admin/queue/vacuum`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(vacuumResponse.status).toBe(200);
      const vacuumResult = await vacuumResponse.json();

      expect(vacuumResult).toMatchObject({
        vacuumed_tables: expect.any(Array),
        space_reclaimed: expect.any(Number),
        duration_ms: expect.any(Number),
      });
    });
  });
});
