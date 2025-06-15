/**
 * Enhanced Supabase PGMQ Configuration
 * Follows coding standards: Single responsibility, under 200 lines
 */

export interface SupabaseQueueConfig {
  queues: {
    [key: string]: QueueSettings;
  };
  database: DatabaseConfig;
  workers: WorkerConfig;
  monitoring: MonitoringConfig;
}

export interface QueueSettings {
  type: 'standard' | 'unlogged' | 'partitioned';
  batchSize: number;
  visibilityTimeout: number;
  pollInterval: number;
  longPolling: boolean;
  maxRetries: number;
  partitionInterval?: string;
  retentionInterval?: string;
  priority: number;
}

export interface DatabaseConfig {
  connectionPoolSize: number;
  statementTimeout: number;
  idleTimeout: number;
}

export interface WorkerConfig {
  fileProcessing: WorkerSettings;
  embeddings: WorkerSettings;
  notifications: WorkerSettings;
  cleanup: WorkerSettings;
}

export interface WorkerSettings {
  concurrency: number;
  maxMemory: string;
  restartPolicy: 'always' | 'on-failure' | 'unless-stopped';
  healthCheckInterval: number;
}

export interface MonitoringConfig {
  metricsInterval: number;
  alertThresholds: AlertThresholds;
  retentionDays: number;
}

export interface AlertThresholds {
  queueDepth: number;
  failureRate: number;
  processingTime: number;
  memoryUsage: number;
}

/**
 * Production-ready Supabase PGMQ configuration
 * Optimized for cost-efficiency and reliability
 */
export const supabaseQueueConfig: SupabaseQueueConfig = {
  queues: {
    // High-throughput file processing with unlogged tables for performance
    file_processing: {
      type: 'unlogged',
      batchSize: 1, // Process one file at a time for resource control
      visibilityTimeout: 600, // 10 minutes for complex file processing
      pollInterval: 2000, // 2 seconds
      longPolling: true, // Reduce database load
      maxRetries: 3,
      priority: 8 // High priority
    },

    // High-volume embedding generation with partitioning
    embedding_generation: {
      type: 'partitioned',
      batchSize: 10, // Process multiple embeddings together
      visibilityTimeout: 300, // 5 minutes for API calls
      pollInterval: 1000, // 1 second
      longPolling: true,
      maxRetries: 5, // More retries for API failures
      partitionInterval: 'daily',
      retentionInterval: '7 days',
      priority: 7 // High priority
    },

    // Standard notifications with high throughput
    notification: {
      type: 'standard',
      batchSize: 50, // Batch notifications for efficiency
      visibilityTimeout: 60, // 1 minute for simple operations
      pollInterval: 5000, // 5 seconds
      longPolling: false, // Not critical for notifications
      maxRetries: 2,
      priority: 5 // Medium priority
    },

    // Cleanup operations with low priority
    cleanup: {
      type: 'standard',
      batchSize: 100, // Large batches for cleanup
      visibilityTimeout: 1800, // 30 minutes for complex cleanup
      pollInterval: 60000, // 1 minute
      longPolling: false,
      maxRetries: 2,
      priority: 3 // Low priority
    }
  },

  database: {
    connectionPoolSize: 10,
    statementTimeout: 30000, // 30 seconds
    idleTimeout: 600000 // 10 minutes
  },

  workers: {
    fileProcessing: {
      concurrency: 2, // Limit concurrent file processing
      maxMemory: '1GB',
      restartPolicy: 'always',
      healthCheckInterval: 30000 // 30 seconds
    },
    embeddings: {
      concurrency: 5, // Higher concurrency for API calls
      maxMemory: '512MB',
      restartPolicy: 'always',
      healthCheckInterval: 30000
    },
    notifications: {
      concurrency: 10, // High concurrency for simple operations
      maxMemory: '256MB',
      restartPolicy: 'always',
      healthCheckInterval: 60000 // 1 minute
    },
    cleanup: {
      concurrency: 1, // Single cleanup process
      maxMemory: '256MB',
      restartPolicy: 'on-failure',
      healthCheckInterval: 300000 // 5 minutes
    }
  },

  monitoring: {
    metricsInterval: 60000, // 1 minute
    alertThresholds: {
      queueDepth: 100, // Alert if queue has >100 pending jobs
      failureRate: 0.05, // Alert if >5% failure rate
      processingTime: 600, // Alert if processing takes >10 minutes
      memoryUsage: 0.8 // Alert if >80% memory usage
    },
    retentionDays: 30
  }
};

/**
 * Environment-specific queue configuration overrides
 */
export const getQueueConfig = (): SupabaseQueueConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'development') {
    return {
      ...supabaseQueueConfig,
      queues: {
        ...supabaseQueueConfig.queues,
        // Smaller batch sizes for development
        file_processing: {
          ...supabaseQueueConfig.queues.file_processing,
          batchSize: 1,
          pollInterval: 5000 // Slower polling in development
        },
        embedding_generation: {
          ...supabaseQueueConfig.queues.embedding_generation,
          batchSize: 2,
          type: 'standard' // Simpler queue type for development
        }
      }
    };
  }

  if (env === 'test') {
    return {
      ...supabaseQueueConfig,
      queues: {
        ...supabaseQueueConfig.queues,
        // Fast processing for tests
        file_processing: {
          ...supabaseQueueConfig.queues.file_processing,
          visibilityTimeout: 30,
          pollInterval: 100
        }
      }
    };
  }

  return supabaseQueueConfig;
};

/**
 * Queue priority mapping for task routing
 */
export const QUEUE_PRIORITIES = {
  CRITICAL: 10,
  HIGH: 7,
  MEDIUM: 5,
  LOW: 3,
  BACKGROUND: 1
} as const;

/**
 * Queue names constants for type safety
 */
export const ENHANCED_QUEUE_NAMES = {
  FILE_PROCESSING: 'file_processing',
  EMBEDDING_GENERATION: 'embedding_generation',
  NOTIFICATION: 'notification',
  CLEANUP: 'cleanup'
} as const;

export type QueueName = typeof ENHANCED_QUEUE_NAMES[keyof typeof ENHANCED_QUEUE_NAMES];