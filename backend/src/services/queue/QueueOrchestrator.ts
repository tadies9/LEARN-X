/**
 * Queue Orchestrator Service
 * Unified interface for all queue operations
 * Follows coding standards: Under 200 lines, single responsibility
 */

import { FileProcessingQueue } from './FileProcessingQueue';
import { EmbeddingQueue } from './EmbeddingQueue';
import { NotificationQueue } from './NotificationQueue';
import { enhancedPGMQClient, QueueMetrics } from './EnhancedPGMQClient';
import { ENHANCED_QUEUE_NAMES, PriorityLevel, mapPriorityToInteger } from '../../config/supabase-queue.config';
import { logger } from '../../utils/logger';

export interface QueueHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: QueueMetrics | null;
  lastCheck: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  queues: QueueHealth[];
  timestamp: string;
}

/**
 * Centralized queue management and coordination service
 */
export class QueueOrchestrator {
  private fileQueue: FileProcessingQueue;
  private embeddingQueue: EmbeddingQueue;
  private notificationQueue: NotificationQueue;

  constructor() {
    this.fileQueue = new FileProcessingQueue();
    this.embeddingQueue = new EmbeddingQueue();
    this.notificationQueue = new NotificationQueue();
  }

  /**
   * Enqueues a file for processing
   * This is the main entry point for file processing
   */
  async enqueueFileProcessing(
    fileId: string,
    userId: string,
    options?: {
      chunkSize?: number;
      priority?: PriorityLevel;
      [key: string]: unknown;
    }
  ): Promise<string> {
    try {
      // Convert string priority to integer for the queue
      const queueOptions = options ? {
        ...options,
        priority: mapPriorityToInteger(options.priority)
      } : undefined;
      
      const msgId = await this.fileQueue.enqueue(fileId, userId, queueOptions);
      
      logger.info(`[QueueOrchestrator] File processing enqueued: ${fileId}`, {
        msgId: msgId.toString(),
        userId,
        options
      });

      return msgId.toString();
    } catch (error) {
      logger.error(`[QueueOrchestrator] Failed to enqueue file processing:`, error);
      throw error;
    }
  }

  /**
   * Enqueues embeddings for generated chunks
   * Typically called by the file processor after chunking
   */
  async enqueueEmbeddingGeneration(
    fileId: string,
    chunks: Array<{
      id: string;
      content: string;
      position: number;
      metadata?: Record<string, unknown>;
    }>,
    userId: string,
    model = 'text-embedding-3-small'
  ): Promise<string[]> {
    try {
      const msgIds = await this.embeddingQueue.enqueueBatch(fileId, chunks, userId, model);
      
      logger.info(`[QueueOrchestrator] Embedding generation enqueued: ${fileId}`, {
        chunkCount: chunks.length,
        batchCount: msgIds.length,
        model
      });

      return msgIds.map(id => id.toString());
    } catch (error) {
      logger.error(`[QueueOrchestrator] Failed to enqueue embedding generation:`, error);
      throw error;
    }
  }

  /**
   * Enqueues a notification for a user
   */
  async enqueueNotification(
    userId: string,
    type: 'file_processed' | 'file_failed' | 'course_shared' | 'system_alert',
    title: string,
    message: string,
    data?: Record<string, unknown>,
    priority: PriorityLevel = 'medium'
  ): Promise<string> {
    try {
      const msgId = await this.notificationQueue.enqueue({
        userId,
        type,
        title,
        message,
        data,
        priority: mapPriorityToInteger(priority)
      });

      logger.debug(`[QueueOrchestrator] Notification enqueued: ${type} for ${userId}`);

      return msgId.toString();
    } catch (error) {
      logger.error(`[QueueOrchestrator] Failed to enqueue notification:`, error);
      throw error;
    }
  }

  /**
   * Gets comprehensive system health across all queues
   */
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const queueNames = Object.values(ENHANCED_QUEUE_NAMES);
      const queueHealthPromises = queueNames.map(queueName => 
        this.getQueueHealth(queueName)
      );

      const queueHealthResults = await Promise.allSettled(queueHealthPromises);
      const queues: QueueHealth[] = queueHealthResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            name: queueNames[index],
            status: 'unhealthy',
            metrics: null,
            lastCheck: new Date().toISOString()
          };
        }
      });

      // Calculate overall system status
      const unhealthyCount = queues.filter(q => q.status === 'unhealthy').length;
      const degradedCount = queues.filter(q => q.status === 'degraded').length;

      let systemStatus: 'healthy' | 'degraded' | 'unhealthy';
      if (unhealthyCount > 0) {
        systemStatus = 'unhealthy';
      } else if (degradedCount > 0) {
        systemStatus = 'degraded';
      } else {
        systemStatus = 'healthy';
      }

      return {
        status: systemStatus,
        queues,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('[QueueOrchestrator] Failed to get system health:', error);
      return {
        status: 'unhealthy',
        queues: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Gets health status for a specific queue
   */
  private async getQueueHealth(queueName: string): Promise<QueueHealth> {
    try {
      const metrics = await enhancedPGMQClient.getQueueMetrics(queueName as keyof typeof ENHANCED_QUEUE_NAMES);
      
      if (!metrics) {
        return {
          name: queueName,
          status: 'unhealthy',
          metrics: null,
          lastCheck: new Date().toISOString()
        };
      }

      // Determine health based on queue metrics
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      // Queue depth thresholds
      if (metrics.queue_length > 1000) {
        status = 'unhealthy';
      } else if (metrics.queue_length > 100) {
        status = 'degraded';
      }

      // Age thresholds (messages sitting too long)
      if (metrics.oldest_msg_age_sec && metrics.oldest_msg_age_sec > 3600) { // 1 hour
        status = 'unhealthy';
      } else if (metrics.oldest_msg_age_sec && metrics.oldest_msg_age_sec > 600) { // 10 minutes
        status = 'degraded';
      }

      return {
        name: queueName,
        status,
        metrics,
        lastCheck: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`[QueueOrchestrator] Failed to get health for queue ${queueName}:`, error);
      return {
        name: queueName,
        status: 'unhealthy',
        metrics: null,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Gets queue metrics for monitoring dashboards
   */
  async getDetailedMetrics(): Promise<{
    fileProcessing: unknown;
    embeddings: unknown;
    notifications: { status: string };
  }> {
    try {
      const [fileMetrics, embeddingMetrics] = await Promise.all([
        this.fileQueue.getMetrics(),
        this.embeddingQueue.getMetrics()
      ]);

      return {
        fileProcessing: fileMetrics,
        embeddings: embeddingMetrics,
        notifications: {
          // Notification queue doesn't have complex metrics
          status: 'active'
        }
      };

    } catch (error) {
      logger.error('[QueueOrchestrator] Failed to get detailed metrics:', error);
      throw error;
    }
  }

  /**
   * Emergency purge function for development/testing
   * WARNING: This deletes all messages in all queues
   */
  async emergencyPurgeAllQueues(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Emergency purge is not allowed in production');
    }

    logger.warn('[QueueOrchestrator] EMERGENCY PURGE: Clearing all queues');

    const queueNames = Object.values(ENHANCED_QUEUE_NAMES);
    const purgeResults = await Promise.allSettled(
      queueNames.map(queueName => 
        enhancedPGMQClient.purge(queueName as keyof typeof ENHANCED_QUEUE_NAMES)
      )
    );

    purgeResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        logger.info(`[QueueOrchestrator] Purged ${result.value} messages from ${queueNames[index]}`);
      } else {
        logger.error(`[QueueOrchestrator] Failed to purge ${queueNames[index]}:`, result.reason);
      }
    });
  }
}

// Export singleton instance
export const queueOrchestrator = new QueueOrchestrator();