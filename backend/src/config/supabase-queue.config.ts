/**
 * Enhanced Supabase PGMQ Configuration
 * Follows coding standards: Single responsibility, under 200 lines
 */

export type QueueName = 'file_processing' | 'embedding_generation' | 'notification' | 'cleanup';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface QueueSettings {
  type: 'standard' | 'unlogged' | 'partitioned';
  visibilityTimeout: number; // seconds
  batchSize: number;
  maxRetries: number;
  retryDelaySeconds: number;
  longPolling: boolean;
  partitionInterval?: string; // for partitioned queues
  retentionInterval?: string; // for partitioned queues
  priority: number; // 1 (highest) to 10 (lowest)
}

export interface QueueConfig {
  queues: Record<QueueName, QueueSettings>;
  global: {
    maxConcurrentJobs: number;
    healthCheckInterval: number; // seconds
    deadLetterQueueEnabled: boolean;
    metricsCollectionInterval: number; // seconds
  };
}

/**
 * Production-optimized queue configuration
 */
const ENHANCED_QUEUE_CONFIG: QueueConfig = {
  queues: {
    // File processing queue - high throughput, unlogged for performance
    file_processing: {
      type: 'unlogged',
      visibilityTimeout: 300, // 5 minutes - enough time for file processing
      batchSize: 5, // Process multiple files concurrently
      maxRetries: 3,
      retryDelaySeconds: 30,
      longPolling: true,
      priority: 2, // High priority
    },

    // Embedding generation queue - partitioned for scalability
    embedding_generation: {
      type: 'partitioned',
      visibilityTimeout: 600, // 10 minutes - embedding generation can be slow
      batchSize: 10, // Process multiple chunks together
      maxRetries: 2,
      retryDelaySeconds: 60,
      longPolling: true,
      partitionInterval: 'daily',
      retentionInterval: '7 days',
      priority: 3, // Medium-high priority
    },

    // Notification queue - standard, reliable delivery
    notification: {
      type: 'standard',
      visibilityTimeout: 60, // 1 minute - notifications should be fast
      batchSize: 20, // High batch size for notifications
      maxRetries: 5, // More retries for notifications
      retryDelaySeconds: 15,
      longPolling: true,
      priority: 4, // Medium priority
    },

    // Cleanup queue - low priority background tasks
    cleanup: {
      type: 'standard',
      visibilityTimeout: 120, // 2 minutes
      batchSize: 1, // Single cleanup tasks
      maxRetries: 2,
      retryDelaySeconds: 300, // 5 minute delay between retries
      longPolling: false, // No rush for cleanup
      priority: 8, // Low priority
    },
  },

  global: {
    maxConcurrentJobs: 50, // Total concurrent jobs across all queues
    healthCheckInterval: 30, // Check health every 30 seconds
    deadLetterQueueEnabled: true, // Enable dead letter queue for failed jobs
    metricsCollectionInterval: 60, // Collect metrics every minute
  },
};

/**
 * Get queue configuration for a specific queue
 */
export function getQueueConfig(): QueueConfig {
  return ENHANCED_QUEUE_CONFIG;
}

/**
 * Get settings for a specific queue
 */
export function getQueueSettings(queueName: QueueName): QueueSettings {
  const config = getQueueConfig();
  const settings = config.queues[queueName];

  if (!settings) {
    throw new Error(`Queue configuration not found for: ${queueName}`);
  }

  return settings;
}

/**
 * Validate queue configuration
 */
export function validateQueueConfig(): boolean {
  const config = getQueueConfig();

  for (const [queueName, settings] of Object.entries(config.queues)) {
    // Validate required fields
    if (!settings.type || !settings.visibilityTimeout || !settings.batchSize) {
      throw new Error(`Invalid configuration for queue: ${queueName}`);
    }

    // Validate ranges
    if (settings.visibilityTimeout < 1 || settings.visibilityTimeout > 3600) {
      throw new Error(`Invalid visibilityTimeout for queue ${queueName}: must be 1-3600 seconds`);
    }

    if (settings.batchSize < 1 || settings.batchSize > 100) {
      throw new Error(`Invalid batchSize for queue ${queueName}: must be 1-100`);
    }

    if (settings.maxRetries < 0 || settings.maxRetries > 10) {
      throw new Error(`Invalid maxRetries for queue ${queueName}: must be 0-10`);
    }

    // Validate partitioned queue settings
    if (settings.type === 'partitioned') {
      if (!settings.partitionInterval || !settings.retentionInterval) {
        throw new Error(
          `Partitioned queue ${queueName} requires partitionInterval and retentionInterval`
        );
      }
    }
  }

  return true;
}

/**
 * Environment-specific overrides
 */
export function getEnvironmentConfig(): Partial<QueueConfig> {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return {
        global: {
          maxConcurrentJobs: 100, // Higher concurrency in production
          healthCheckInterval: 15, // More frequent health checks
          deadLetterQueueEnabled: true,
          metricsCollectionInterval: 30, // More frequent metrics
        },
      };

    case 'development':
      return {
        global: {
          maxConcurrentJobs: 10, // Lower concurrency in development
          healthCheckInterval: 60, // Less frequent health checks
          deadLetterQueueEnabled: false, // Simpler setup for dev
          metricsCollectionInterval: 120, // Less frequent metrics
        },
      };

    case 'test':
      return {
        global: {
          maxConcurrentJobs: 5,
          healthCheckInterval: 120,
          deadLetterQueueEnabled: false,
          metricsCollectionInterval: 300,
        },
      };

    default:
      return {};
  }
}

/**
 * Merge environment-specific config with base config
 */
export function getConfigForEnvironment(): QueueConfig {
  const baseConfig = getQueueConfig();
  const envConfig = getEnvironmentConfig();

  return {
    ...baseConfig,
    global: {
      ...baseConfig.global,
      ...envConfig.global,
    },
    queues: {
      ...baseConfig.queues,
      ...envConfig.queues,
    },
  };
}

/**
 * Queue priority mapping for task routing
 */
export const QUEUE_PRIORITIES = {
  CRITICAL: 10,
  HIGH: 7,
  MEDIUM: 5,
  LOW: 3,
  BACKGROUND: 1,
} as const;

/**
 * Convert string priority to integer priority
 */
export function mapPriorityToInteger(priority?: PriorityLevel | number): number {
  if (typeof priority === 'number') {
    return priority;
  }

  switch (priority) {
    case 'critical':
      return QUEUE_PRIORITIES.CRITICAL;
    case 'high':
      return QUEUE_PRIORITIES.HIGH;
    case 'medium':
      return QUEUE_PRIORITIES.MEDIUM;
    case 'low':
      return QUEUE_PRIORITIES.LOW;
    default:
      return QUEUE_PRIORITIES.MEDIUM; // Default
  }
}

/**
 * Queue names constants for type safety
 */
export const ENHANCED_QUEUE_NAMES = {
  FILE_PROCESSING: 'file_processing',
  EMBEDDING_GENERATION: 'embedding_generation',
  NOTIFICATION: 'notification',
  CLEANUP: 'cleanup',
} as const;
