import { pgmqService } from '../services/queue/PGMQService';
import { logger } from '../utils/logger';

// Queue names
export const QUEUE_NAMES = {
  FILE_PROCESSING: 'file_processing',
  EMBEDDING_GENERATION: 'embedding_generation',
  NOTIFICATION: 'notification',
  CLEANUP: 'cleanup',
} as const;

// Job types
export const JOB_TYPES = {
  // File processing jobs
  PROCESS_FILE: 'process-file',
  CLEANUP_FILE: 'cleanup-file',

  // Embedding jobs
  GENERATE_EMBEDDINGS: 'generate-embeddings',
  MIGRATE_EMBEDDINGS: 'migrate-embeddings',

  // Notification jobs
  SEND_NOTIFICATION: 'send-notification',
  SEND_EMAIL: 'send-email',

  // Cleanup jobs
  CLEANUP_OLD_FILES: 'cleanup-old-files',
  CLEANUP_OLD_JOBS: 'cleanup-old-jobs',
} as const;

// Queue configurations
export const QUEUE_CONFIGS = {
  [QUEUE_NAMES.FILE_PROCESSING]: {
    batchSize: 1,
    pollInterval: 1000,
    visibilityTimeout: 300, // 5 minutes
  },
  [QUEUE_NAMES.EMBEDDING_GENERATION]: {
    batchSize: 5,
    pollInterval: 2000,
    visibilityTimeout: 600, // 10 minutes
  },
  [QUEUE_NAMES.NOTIFICATION]: {
    batchSize: 10,
    pollInterval: 5000,
    visibilityTimeout: 60, // 1 minute
  },
  [QUEUE_NAMES.CLEANUP]: {
    batchSize: 1,
    pollInterval: 60000, // 1 minute
    visibilityTimeout: 300, // 5 minutes
  },
};

// Helper functions for job enqueuing
export const enqueueFileProcessing = async (fileId: string, userId: string, options?: any) => {
  return pgmqService.enqueue(QUEUE_NAMES.FILE_PROCESSING, JOB_TYPES.PROCESS_FILE, {
    fileId,
    userId,
    processingOptions: options,
  });
};

export const enqueueEmbeddingGeneration = async (
  fileId: string,
  userId: string,
  chunks: Array<{ id: string; content: string; position: number }>
) => {
  return pgmqService.enqueue(QUEUE_NAMES.EMBEDDING_GENERATION, JOB_TYPES.GENERATE_EMBEDDINGS, {
    fileId,
    userId,
    chunks,
  });
};

export const enqueueNotification = async (userId: string, type: string, data: any) => {
  return pgmqService.enqueue(QUEUE_NAMES.NOTIFICATION, JOB_TYPES.SEND_NOTIFICATION, {
    userId,
    type,
    ...data,
  });
};

export const enqueueFileCleanup = async (fileId: string) => {
  return pgmqService.enqueue(QUEUE_NAMES.CLEANUP, JOB_TYPES.CLEANUP_FILE, { fileId });
};

// Start queue health monitoring
export const startQueueMonitoring = () => {
  const checkHealth = async () => {
    try {
      const health = await pgmqService.getQueueHealth();

      for (const queue of health) {
        if (queue.dead_count > 0) {
          logger.warn(`[Queue Health] Dead messages in ${queue.queue_name}:`, queue.dead_count);
        }

        if (queue.failed_count > 10) {
          logger.warn(
            `[Queue Health] High failure rate in ${queue.queue_name}:`,
            queue.failed_count
          );
        }

        if (queue.processing_count > 50) {
          logger.warn(
            `[Queue Health] High processing count in ${queue.queue_name}:`,
            queue.processing_count
          );
        }
      }
    } catch (error) {
      logger.error('[Queue Health] Failed to check queue health:', error);
    }
  };

  // Check health every 5 minutes
  setInterval(checkHealth, 5 * 60 * 1000);

  // Initial check
  checkHealth();
};

// Start cleanup job
export const startCleanupJob = () => {
  const cleanup = async () => {
    try {
      const deletedCount = await pgmqService.cleanupOldJobs(7);
      logger.info(`[Cleanup] Deleted ${deletedCount} old jobs`);
    } catch (error) {
      logger.error('[Cleanup] Failed to cleanup old jobs:', error);
    }
  };

  // Run cleanup daily
  setInterval(cleanup, 24 * 60 * 60 * 1000);

  // Initial cleanup
  cleanup();
};

// Export queue service
export { pgmqService };
