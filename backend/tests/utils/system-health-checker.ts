import { testConfig } from '../config/test.config';

/**
 * System Health Checker
 * 
 * Validates that all system components are ready for E2E testing
 * before running comprehensive test suites.
 */
export class SystemHealthChecker {
  
  /**
   * Performs comprehensive system health check
   */
  async checkSystemHealth(): Promise<{
    isHealthy: boolean;
    issues: string[];
    services: {
      backend: boolean;
      database: boolean;
      redis: boolean;
      pythonAI: boolean;
      queue: boolean;
    };
    performance: {
      avgResponseTime: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  }> {
    const issues: string[] = [];
    const services = {
      backend: false,
      database: false,
      redis: false,
      pythonAI: false,
      queue: false
    };

    console.log('🔍 Checking system health...');

    // Check backend API
    try {
      const response = await fetch(`${testConfig.api.baseUrl}/health`, {
        timeout: 5000
      } as RequestInit);
      services.backend = response.ok;
      if (!response.ok) {
        issues.push(`Backend API unhealthy: ${response.status}`);
      }
    } catch (error) {
      issues.push(`Backend API unreachable: ${(error as Error).message}`);
    }

    // Check database connectivity
    try {
      const response = await fetch(`${testConfig.api.baseUrl}/health/database`, {
        timeout: 5000
      } as RequestInit);
      services.database = response.ok;
      if (!response.ok) {
        issues.push(`Database unhealthy: ${response.status}`);
      }
    } catch (error) {
      issues.push(`Database unreachable: ${(error as Error).message}`);
    }

    // Check Redis
    try {
      const response = await fetch(`${testConfig.api.baseUrl}/health/redis`, {
        timeout: 5000
      } as RequestInit);
      services.redis = response.ok;
      if (!response.ok) {
        issues.push(`Redis unhealthy: ${response.status}`);
      }
    } catch (error) {
      issues.push(`Redis unreachable: ${(error as Error).message}`);
    }

    // Check Python AI Service
    try {
      const response = await fetch(`${testConfig.api.baseUrl}/api/v1/ai/health`, {
        timeout: 10000
      } as RequestInit);
      services.pythonAI = response.ok;
      if (!response.ok) {
        issues.push(`Python AI Service unhealthy: ${response.status}`);
      }
    } catch (error) {
      issues.push(`Python AI Service unreachable: ${(error as Error).message}`);
    }

    // Check Queue System
    try {
      const response = await fetch(`${testConfig.api.baseUrl}/health/queue`, {
        timeout: 5000
      } as RequestInit);
      services.queue = response.ok;
      if (!response.ok) {
        issues.push(`Queue system unhealthy: ${response.status}`);
      }
    } catch (error) {
      issues.push(`Queue system unreachable: ${(error as Error).message}`);
    }

    // Performance check
    const performanceStart = Date.now();
    const performancePromises = [
      this.checkResponseTime(),
      this.checkMemoryUsage(),
      this.checkCPUUsage()
    ];

    const [avgResponseTime, memoryUsage, cpuUsage] = await Promise.allSettled(performancePromises);

    const isHealthy = Object.values(services).every(Boolean) && issues.length === 0;

    return {
      isHealthy,
      issues,
      services,
      performance: {
        avgResponseTime: avgResponseTime.status === 'fulfilled' ? avgResponseTime.value : 0,
        memoryUsage: memoryUsage.status === 'fulfilled' ? memoryUsage.value : 0,
        cpuUsage: cpuUsage.status === 'fulfilled' ? cpuUsage.value : 0
      }
    };
  }

  /**
   * Checks average API response time
   */
  private async checkResponseTime(): Promise<number> {
    const endpoints = [
      '/health',
      '/api/v1/health',
      '/health/database'
    ];

    const responseTimes: number[] = [];

    for (const endpoint of endpoints) {
      try {
        const start = Date.now();
        const response = await fetch(`${testConfig.api.baseUrl}${endpoint}`, {
          timeout: 5000
        } as RequestInit);
        const end = Date.now();
        
        if (response.ok) {
          responseTimes.push(end - start);
        }
      } catch (error) {
        // Skip failed requests for avg calculation
      }
    }

    return responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
  }

  /**
   * Checks system memory usage
   */
  private async checkMemoryUsage(): Promise<number> {
    try {
      const response = await fetch(`${testConfig.api.baseUrl}/health/system`, {
        timeout: 5000
      } as RequestInit);
      
      if (response.ok) {
        const data = await response.json();
        return data.memory?.usage || 0;
      }
    } catch (error) {
      console.warn('Failed to get memory usage:', error);
    }
    
    return 0;
  }

  /**
   * Checks system CPU usage
   */
  private async checkCPUUsage(): Promise<number> {
    try {
      const response = await fetch(`${testConfig.api.baseUrl}/health/system`, {
        timeout: 5000
      } as RequestInit);
      
      if (response.ok) {
        const data = await response.json();
        return data.cpu?.usage || 0;
      }
    } catch (error) {
      console.warn('Failed to get CPU usage:', error);
    }
    
    return 0;
  }

  /**
   * Validates database migrations and schema
   */
  async validateDatabaseSchema(): Promise<{
    isValid: boolean;
    missingTables: string[];
    missingIndexes: string[];
    issues: string[];
  }> {
    const issues: string[] = [];
    const missingTables: string[] = [];
    const missingIndexes: string[] = [];

    try {
      const response = await fetch(`${testConfig.api.baseUrl}/health/database/schema`, {
        timeout: 10000
      } as RequestInit);
      
      if (response.ok) {
        const schemaData = await response.json();
        
        // Check required tables
        const requiredTables = [
          'users', 'courses', 'modules', 'files', 'chunks', 
          'embeddings', 'ai_content', 'personas', 'pgmq_queue'
        ];
        
        for (const table of requiredTables) {
          if (!schemaData.tables?.includes(table)) {
            missingTables.push(table);
          }
        }

        // Check required indexes
        const requiredIndexes = [
          'idx_embeddings_vector',
          'idx_chunks_file_id',
          'idx_files_user_id',
          'idx_pgmq_queue_created_at'
        ];

        for (const index of requiredIndexes) {
          if (!schemaData.indexes?.includes(index)) {
            missingIndexes.push(index);
          }
        }

        if (missingTables.length > 0) {
          issues.push(`Missing tables: ${missingTables.join(', ')}`);
        }

        if (missingIndexes.length > 0) {
          issues.push(`Missing indexes: ${missingIndexes.join(', ')}`);
        }

      } else {
        issues.push(`Schema validation failed: ${response.status}`);
      }
    } catch (error) {
      issues.push(`Schema validation error: ${(error as Error).message}`);
    }

    return {
      isValid: issues.length === 0,
      missingTables,
      missingIndexes,
      issues
    };
  }

  /**
   * Validates queue system health
   */
  async validateQueueSystem(): Promise<{
    isHealthy: boolean;
    queues: {
      fileProcessing: boolean;
      aiGeneration: boolean;
      embeddings: boolean;
      notifications: boolean;
    };
    metrics: {
      pendingJobs: number;
      processingJobs: number;
      failedJobs: number;
      averageProcessingTime: number;
    };
    issues: string[];
  }> {
    const issues: string[] = [];
    const queues = {
      fileProcessing: false,
      aiGeneration: false,
      embeddings: false,
      notifications: false
    };

    let metrics = {
      pendingJobs: 0,
      processingJobs: 0,
      failedJobs: 0,
      averageProcessingTime: 0
    };

    try {
      const response = await fetch(`${testConfig.api.baseUrl}/health/queue/detailed`, {
        timeout: 10000
      } as RequestInit);
      
      if (response.ok) {
        const queueData = await response.json();
        
        // Check individual queues
        queues.fileProcessing = queueData.queues?.file_processing?.healthy || false;
        queues.aiGeneration = queueData.queues?.ai_generation?.healthy || false;
        queues.embeddings = queueData.queues?.embeddings?.healthy || false;
        queues.notifications = queueData.queues?.notifications?.healthy || false;

        // Extract metrics
        metrics = {
          pendingJobs: queueData.metrics?.pending || 0,
          processingJobs: queueData.metrics?.processing || 0,
          failedJobs: queueData.metrics?.failed || 0,
          averageProcessingTime: queueData.metrics?.avgProcessingTime || 0
        };

        // Check for issues
        if (metrics.failedJobs > 10) {
          issues.push(`High number of failed jobs: ${metrics.failedJobs}`);
        }

        if (metrics.averageProcessingTime > 30000) {
          issues.push(`Slow queue processing: ${metrics.averageProcessingTime}ms avg`);
        }

        Object.entries(queues).forEach(([queueName, healthy]) => {
          if (!healthy) {
            issues.push(`Queue ${queueName} is unhealthy`);
          }
        });

      } else {
        issues.push(`Queue health check failed: ${response.status}`);
      }
    } catch (error) {
      issues.push(`Queue validation error: ${(error as Error).message}`);
    }

    return {
      isHealthy: issues.length === 0 && Object.values(queues).every(Boolean),
      queues,
      metrics,
      issues
    };
  }

  /**
   * Validates AI service integration
   */
  async validateAIServiceIntegration(): Promise<{
    isHealthy: boolean;
    providers: {
      openai: boolean;
      anthropic: boolean;
      local: boolean;
    };
    capabilities: {
      textGeneration: boolean;
      embeddings: boolean;
      streamingSupport: boolean;
      costTracking: boolean;
    };
    performance: {
      avgResponseTime: number;
      tokensPerSecond: number;
      errorRate: number;
    };
    issues: string[];
  }> {
    const issues: string[] = [];
    const providers = {
      openai: false,
      anthropic: false,
      local: false
    };
    const capabilities = {
      textGeneration: false,
      embeddings: false,
      streamingSupport: false,
      costTracking: false
    };
    let performance = {
      avgResponseTime: 0,
      tokensPerSecond: 0,
      errorRate: 0
    };

    try {
      const response = await fetch(`${testConfig.api.baseUrl}/api/v1/ai/health/detailed`, {
        timeout: 15000
      } as RequestInit);
      
      if (response.ok) {
        const aiData = await response.json();
        
        // Check providers
        providers.openai = aiData.providers?.openai?.healthy || false;
        providers.anthropic = aiData.providers?.anthropic?.healthy || false;
        providers.local = aiData.providers?.local?.healthy || false;

        // Check capabilities
        capabilities.textGeneration = aiData.capabilities?.textGeneration || false;
        capabilities.embeddings = aiData.capabilities?.embeddings || false;
        capabilities.streamingSupport = aiData.capabilities?.streaming || false;
        capabilities.costTracking = aiData.capabilities?.costTracking || false;

        // Performance metrics
        performance = {
          avgResponseTime: aiData.performance?.avgResponseTime || 0,
          tokensPerSecond: aiData.performance?.tokensPerSecond || 0,
          errorRate: aiData.performance?.errorRate || 0
        };

        // Check for issues
        if (!providers.openai && !providers.local) {
          issues.push('No AI providers available');
        }

        if (performance.errorRate > 0.1) {
          issues.push(`High AI error rate: ${(performance.errorRate * 100).toFixed(1)}%`);
        }

        if (performance.avgResponseTime > 10000) {
          issues.push(`Slow AI responses: ${performance.avgResponseTime}ms avg`);
        }

      } else {
        issues.push(`AI service health check failed: ${response.status}`);
      }
    } catch (error) {
      issues.push(`AI service validation error: ${(error as Error).message}`);
    }

    return {
      isHealthy: issues.length === 0,
      providers,
      capabilities,
      performance,
      issues
    };
  }

  /**
   * Runs a quick smoke test on critical endpoints
   */
  async runSmokeTest(): Promise<{
    passed: boolean;
    results: Array<{
      endpoint: string;
      status: number;
      responseTime: number;
      success: boolean;
    }>;
  }> {
    const endpoints = [
      { path: '/health', method: 'GET' },
      { path: '/api/v1/health', method: 'GET' },
      { path: '/health/database', method: 'GET' },
      { path: '/health/redis', method: 'GET' },
      { path: '/health/queue', method: 'GET' },
      { path: '/api/v1/ai/health', method: 'GET' }
    ];

    const results = [];

    for (const endpoint of endpoints) {
      const start = Date.now();
      try {
        const response = await fetch(`${testConfig.api.baseUrl}${endpoint.path}`, {
          method: endpoint.method,
          timeout: 5000
        } as RequestInit);
        
        const responseTime = Date.now() - start;
        
        results.push({
          endpoint: endpoint.path,
          status: response.status,
          responseTime,
          success: response.ok
        });
      } catch (error) {
        results.push({
          endpoint: endpoint.path,
          status: 0,
          responseTime: Date.now() - start,
          success: false
        });
      }
    }

    const passed = results.every(result => result.success);

    return {
      passed,
      results
    };
  }
}