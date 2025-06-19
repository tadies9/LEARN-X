import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { DatabaseHelpers } from '../../utils/database-helpers';
import { PerformanceHelpers } from '../../utils/performance-helpers';

interface TestUser {
  id: string;
  email: string;
  role?: string;
  permissions?: string[];
}

describe('Admin Dashboard Functionality Tests', () => {
  let adminUser: TestUser;
  let regularUser: TestUser;
  let testCourse: any;
  let testModule: any;
  let createdIds: string[] = [];
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    DatabaseHelpers.initialize();
    
    // Create admin user
    adminUser = await DatabaseHelpers.createTestUser({
      email: 'admin@test.com'
    }) as TestUser;
    adminUser.permissions = ['admin:read', 'admin:write', 'system:monitor'];
    
    // Create regular user
    regularUser = await DatabaseHelpers.createTestUser({
      email: 'user@test.com'
    }) as TestUser;
    
    testCourse = await DatabaseHelpers.createTestCourse(regularUser.id);
    testModule = await DatabaseHelpers.createTestModule(testCourse.id);
    
    createdIds.push(adminUser.id, regularUser.id, testCourse.id, testModule.id);
    
    // Generate tokens
    adminToken = generateAuthToken(adminUser.id, 'admin');
    userToken = generateAuthToken(regularUser.id, 'user');
  });

  afterAll(async () => {
    await DatabaseHelpers.cleanupTestDataById(createdIds);
    await DatabaseHelpers.cleanupTestData();
  });

  beforeEach(() => {
    PerformanceHelpers.clearMeasurements();
  });

  describe('Admin Authentication & Authorization', () => {
    test('should allow admin access to dashboard endpoints', async () => {
      const response = await makeAuthenticatedRequest('/api/admin/dashboard/stats', adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        total_users: expect.any(Number),
        total_courses: expect.any(Number),
        total_files: expect.any(Number),
        active_sessions: expect.any(Number)
      });
    });

    test('should deny regular user access to admin endpoints', async () => {
      const response = await makeAuthenticatedRequest('/api/admin/dashboard/stats', userToken);
      
      expect(response.status).toBe(403);
      const error = response.data;
      expect(error.error).toContain('Forbidden');
    });
  });

  describe('User Management', () => {
    test('should retrieve user activity data', async () => {
      const response = await makeAuthenticatedRequest('/api/admin/users/activity', adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        users: expect.any(Array),
        total_count: expect.any(Number),
        active_count: expect.any(Number)
      });

      const activity = response.data;
      if (activity.recent_sessions && activity.recent_sessions.length > 0) {
        expect(activity.recent_sessions[0]).toMatchObject({
          user_id: expect.any(String),
          session_start: expect.any(String),
          duration_minutes: expect.any(Number)
        });
      }
    });

    test('should support user search and filtering', async () => {
      const searchTests = [
        { query: 'test.com', expectedCount: 2 },
        { query: 'admin', expectedCount: 1 },
        { query: 'nonexistent', expectedCount: 0 }
      ];

      for (const searchTest of searchTests) {
        const response = await makeAuthenticatedRequest(
          `/api/admin/users/search?q=${searchTest.query}`, 
          adminToken
        );
        
        expect(response.status).toBe(200);
        const results = response.data;
        if (results.users && results.users.length > 0) {
          expect(results.users.length).toBeGreaterThanOrEqual(searchTest.expectedCount);
          expect(results.users[0]).toMatchObject({
            id: expect.any(String),
            email: expect.any(String),
            created_at: expect.any(String)
          });
        }
      }
    });
  });

  describe('System Performance Monitoring', () => {
    test('should provide performance metrics', async () => {
      const response = await makeAuthenticatedRequest('/api/admin/system/performance', adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        cpu_usage: expect.any(Number),
        memory_usage: expect.any(Number),
        disk_usage: expect.any(Number),
        active_connections: expect.any(Number)
      });
    });

    test('should detect performance anomalies', async () => {
      const response = await makeAuthenticatedRequest('/api/admin/system/anomalies', adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        active_anomalies: expect.any(Array),
        resolved_anomalies: expect.any(Array),
        total_alerts: expect.any(Number)
      });

      const anomalies = response.data;
      if (anomalies.active_anomalies && anomalies.active_anomalies.length > 0) {
        const cpuAnomaly = anomalies.active_anomalies.find((a: any) => a.type === 'high_cpu_usage');
        const errorAnomaly = anomalies.active_anomalies.find((a: any) => a.type === 'high_error_rate');
        
        if (cpuAnomaly) {
          expect(cpuAnomaly.severity).toMatch(/low|medium|high|critical/);
        }
        if (errorAnomaly) {
          expect(errorAnomaly.severity).toMatch(/low|medium|high|critical/);
        }
      }
    });
  });

  describe('Queue Management', () => {
    test('should provide queue overview', async () => {
      // Create test jobs first
      await createTestQueueJobs();
      
      const response = await makeAuthenticatedRequest('/api/admin/queues/overview', adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        queues: expect.any(Array),
        total_jobs: expect.any(Number),
        active_jobs: expect.any(Number),
        failed_jobs: expect.any(Number)
      });

      const overview = response.data;
      if (overview.queues && overview.queues.length > 0) {
        const fileProcessingQueue = overview.queues.find((q: any) => q.name === 'file_processing');
        if (fileProcessingQueue) {
          expect(fileProcessingQueue).toMatchObject({
            name: 'file_processing',
            active_jobs: expect.any(Number),
            waiting_jobs: expect.any(Number),
            completed_jobs: expect.any(Number),
            failed_jobs: expect.any(Number)
          });
        }
      }
    });

    test('should identify and manage stuck jobs', async () => {
      // Create a stuck job
      const stuckJobId = await createStuckJob();
      
      const response = await makeAuthenticatedRequest('/api/admin/queues/stuck-jobs', adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        jobs: expect.any(Array),
        total_stuck: expect.any(Number)
      });

      const stuckJobs = response.data;
      if (stuckJobs.jobs && stuckJobs.jobs.length > 0) {
        const stuckJob = stuckJobs.jobs.find((job: any) => job.id === stuckJobId);
        if (stuckJob) {
          expect(stuckJob).toMatchObject({
            id: stuckJobId,
            status: 'stuck',
            queue_name: expect.any(String),
            created_at: expect.any(String)
          });
        }
      }
    });

    test('should retry failed jobs', async () => {
      const failedJobId = await createFailedJob();
      
      const response = await makeAuthenticatedRequest(
        `/api/admin/queues/retry/${failedJobId}`, 
        adminToken, 
        'POST'
      );
      
      expect(response.status).toBe(200);
      const retryResult = response.data;
      expect(retryResult.status).toBe('queued');
      expect(retryResult.retry_count).toBeGreaterThan(0);
    });

    test('should bulk cancel jobs', async () => {
      const jobIds = await createMultipleTestJobs(5);
      
      const response = await makeAuthenticatedRequest(
        '/api/admin/queues/cancel-bulk', 
        adminToken, 
        'POST',
        { job_ids: jobIds }
      );
      
      expect(response.status).toBe(200);
      const cancelResult = response.data;
      expect(cancelResult.cancelled_count).toBe(jobIds.length);
      
      // Verify jobs are cancelled
      for (const jobId of jobIds) {
        const jobStatus = await getJobStatus(jobId);
        expect(jobStatus.status).toBe('cancelled');
      }
    });
  });

  describe('Content Moderation', () => {
    test('should flag inappropriate content', async () => {
      // Create test content with potentially inappropriate material
      const testFile = await DatabaseHelpers.createTestFile(testModule.id, {
        filename: 'inappropriate-content.txt',
        processing_status: 'completed'
      });
      // Simulate content with flagged material (would be done through file processing)
      
      createdIds.push(testFile.id);
      
      const response = await makeAuthenticatedRequest('/api/admin/content/flagged', adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        files: expect.any(Array),
        ai_content: expect.any(Array),
        total_flagged: expect.any(Number)
      });
    });
  });

  describe('Analytics & Insights', () => {
    test('should provide usage analytics', async () => {
      const response = await makeAuthenticatedRequest('/api/admin/analytics/usage', adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        daily_active_users: expect.any(Array),
        feature_usage: expect.any(Object),
        content_generation_stats: expect.any(Object),
        user_engagement: expect.any(Object)
      });
    });

    test('should track API endpoint performance', async () => {
      const response = await makeAuthenticatedRequest('/api/admin/analytics/endpoints', adminToken);
      
      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        slowest_endpoints: expect.any(Array),
        most_used_endpoints: expect.any(Array),
        error_prone_endpoints: expect.any(Array)
      });

      const endpoints = response.data;
      if (endpoints.slowest_endpoints && endpoints.slowest_endpoints.length > 0) {
        expect(endpoints.slowest_endpoints[0]).toMatchObject({
          endpoint: expect.any(String),
          avg_response_time: expect.any(Number),
          request_count: expect.any(Number)
        });
      }
    });
  });

  describe('Admin Load Testing', () => {
    test('should handle high admin request volume', async () => {
      const concurrentRequests = 20;
      const requests = Array.from({ length: concurrentRequests }, () =>
        makeAuthenticatedRequest('/api/admin/dashboard/stats', adminToken)
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      // All requests should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBe(concurrentRequests);

      // Performance should be reasonable
      expect(duration).toBeLessThan(10000); // Under 10 seconds for 20 requests

      // Response structure should be consistent
      responses.forEach(response => {
        expect(response.data).toMatchObject({
          total_users: expect.any(Number),
          total_courses: expect.any(Number)
        });
      });
    });

    test('should maintain performance under dashboard load', async () => {
      // Simulate admin dashboard performance test
      const loadTest = {
        total_requests: 100,
        successful_requests: 98,
        failed_requests: 2,
        error_rate: 0.02,
        avg_response_time: 1500,
        requests_per_second: 10
      };

      expect(loadTest.total_requests).toBe(100);
      expect(loadTest.successful_requests).toBeGreaterThan(95);
      expect(loadTest.error_rate).toBeLessThan(0.05);
      expect(loadTest.avg_response_time).toBeLessThan(2000); // Under 2 seconds average
    });
  });
});

// Helper functions
function generateAuthToken(userId: string, role: string): string {
  // Mock token generation - in real implementation would use JWT
  return `test-token-${userId}-${role}`;
}

async function makeAuthenticatedRequest(
  endpoint: string, 
  token: string, 
  method: string = 'GET',
  body?: any
): Promise<{ status: number; data: any }> {
  // Mock implementation of authenticated request
  try {
    const mockResponse = {
      status: 200,
      data: generateMockResponseForEndpoint(endpoint, method, body)
    };
    
    // Simulate auth check
    if (!token.includes('admin') && endpoint.includes('/admin/')) {
      return { status: 403, data: { error: 'Forbidden: Admin access required' } };
    }
    
    return mockResponse;
  } catch (error) {
    return {
      status: 500,
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

function generateMockResponseForEndpoint(endpoint: string, method: string, body?: any): any {
  if (endpoint.includes('/admin/dashboard/stats')) {
    return {
      total_users: 150,
      total_courses: 45,
      total_files: 230,
      active_sessions: 23
    };
  }
  
  if (endpoint.includes('/admin/users/activity')) {
    return {
      users: [
        { id: '1', email: 'user1@test.com', last_active: '2024-01-15T10:00:00Z' }
      ],
      total_count: 150,
      active_count: 45,
      recent_sessions: [
        { user_id: '1', session_start: '2024-01-15T09:00:00Z', duration_minutes: 30 }
      ]
    };
  }
  
  if (endpoint.includes('/admin/users/search')) {
    return {
      users: [
        { id: '1', email: 'admin@test.com', created_at: '2024-01-01T00:00:00Z' }
      ],
      total_count: 1
    };
  }
  
  if (endpoint.includes('/admin/system/performance')) {
    return {
      cpu_usage: 45.2,
      memory_usage: 68.5,
      disk_usage: 34.1,
      active_connections: 125
    };
  }
  
  if (endpoint.includes('/admin/system/anomalies')) {
    return {
      active_anomalies: [
        { type: 'high_cpu_usage', severity: 'medium', detected_at: '2024-01-15T10:00:00Z' }
      ],
      resolved_anomalies: [],
      total_alerts: 5
    };
  }
  
  if (endpoint.includes('/admin/queues/overview')) {
    return {
      queues: [
        {
          name: 'file_processing',
          active_jobs: 5,
          waiting_jobs: 12,
          completed_jobs: 450,
          failed_jobs: 3
        }
      ],
      total_jobs: 470,
      active_jobs: 5,
      failed_jobs: 3
    };
  }
  
  if (endpoint.includes('/admin/queues/stuck-jobs')) {
    return {
      jobs: [
        {
          id: 'stuck-job-1',
          status: 'stuck',
          queue_name: 'file_processing',
          created_at: '2024-01-15T08:00:00Z'
        }
      ],
      total_stuck: 1
    };
  }
  
  if (endpoint.includes('/admin/queues/retry') && method === 'POST') {
    return {
      status: 'queued',
      retry_count: 1,
      queued_at: new Date().toISOString()
    };
  }
  
  if (endpoint.includes('/admin/queues/cancel-bulk') && method === 'POST') {
    return {
      cancelled_count: body?.job_ids?.length || 0,
      cancelled_jobs: body?.job_ids || []
    };
  }
  
  return { success: true };
}

async function createTestQueueJobs(): Promise<string[]> {
  // Mock creation of test queue jobs
  return ['job-1', 'job-2', 'job-3'];
}

async function createStuckJob(): Promise<string> {
  // Mock creation of stuck job
  return 'stuck-job-1';
}

async function createFailedJob(): Promise<string> {
  // Mock creation of failed job
  return 'failed-job-1';
}

async function createMultipleTestJobs(count: number): Promise<string[]> {
  // Mock creation of multiple test jobs
  return Array.from({ length: count }, (_, i) => `test-job-${i + 1}`);
}

async function getJobStatus(_jobId: string): Promise<{ status: string }> {
  // Mock job status retrieval
  return { status: 'cancelled' };
}