/**
 * Notification Queue Service
 * High-throughput queue for user notifications
 * Follows coding standards: Under 200 lines, single responsibility
 */

import { EnhancedPGMQClient, QueueJob } from './EnhancedPGMQClient';
import { ENHANCED_QUEUE_NAMES, mapPriorityToInteger } from '../../config/supabase-queue.config';
import { logger } from '../../utils/logger';
import { supabase } from '../../config/supabase';

export interface NotificationPayload {
  userId: string;
  type: 'file_processed' | 'file_failed' | 'course_shared' | 'system_alert';
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: number; // Use integer priorities
  queuedAt: string;
}

export class NotificationQueue {
  private client: EnhancedPGMQClient;
  private queueName = ENHANCED_QUEUE_NAMES.NOTIFICATION;
  private isProcessing = false;

  constructor() {
    this.client = new EnhancedPGMQClient();
  }

  /**
   * Starts the notification queue processing
   */
  async start(): Promise<void> {
    try {
      await this.client.createQueue(this.queueName);

      this.isProcessing = true;
      this.processWithHighThroughput();

      logger.info('[NotificationQueue] Started with high-throughput processing');
    } catch (error) {
      logger.error('[NotificationQueue] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Enqueues a single notification
   */
  async enqueue(notification: Omit<NotificationPayload, 'queuedAt'>): Promise<bigint> {
    try {
      const payload: NotificationPayload = {
        ...notification,
        queuedAt: new Date().toISOString(),
      };

      const msgId = await this.client.send(this.queueName, payload);

      logger.debug(`[NotificationQueue] Enqueued notification: ${notification.type}`, {
        msgId: msgId.toString(),
        userId: notification.userId,
        priority: notification.priority || mapPriorityToInteger('medium'),
      });

      return msgId;
    } catch (error) {
      logger.error('[NotificationQueue] Failed to enqueue notification:', error);
      throw error;
    }
  }

  /**
   * Enqueues multiple notifications as a batch
   */
  async enqueueBatch(
    notifications: Array<Omit<NotificationPayload, 'queuedAt'>>
  ): Promise<bigint[]> {
    try {
      const payloads: NotificationPayload[] = notifications.map((notification) => ({
        ...notification,
        queuedAt: new Date().toISOString(),
      }));

      const msgIds = await this.client.sendBatch(this.queueName, payloads);

      logger.info(`[NotificationQueue] Enqueued batch: ${notifications.length} notifications`);

      return msgIds;
    } catch (error) {
      logger.error('[NotificationQueue] Failed to enqueue batch:', error);
      throw error;
    }
  }

  /**
   * Stops the queue processing
   */
  async stop(): Promise<void> {
    this.isProcessing = false;
    logger.info('[NotificationQueue] Stopped processing');
  }

  /**
   * High-throughput processing optimized for notifications
   */
  private async processWithHighThroughput(): Promise<void> {
    const pollInterval = 5000; // 5 seconds for notifications

    while (this.isProcessing) {
      try {
        // Standard polling for notifications (no long-polling needed)
        const jobs = await this.client.read(this.queueName);

        if (jobs.length > 0) {
          await this.processBatch(jobs as QueueJob<NotificationPayload>[]);
        }

        await this.sleep(pollInterval);
      } catch (error) {
        logger.error('[NotificationQueue] Processing error:', error);
        await this.sleep(pollInterval * 2);
      }
    }
  }

  /**
   * Processes a batch of notification jobs
   */
  private async processBatch(jobs: QueueJob<NotificationPayload>[]): Promise<void> {
    logger.debug(`[NotificationQueue] Processing batch: ${jobs.length} notifications`);

    // Process all notifications in parallel (they're independent)
    const results = await Promise.allSettled(jobs.map((job) => this.processJob(job)));

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    logger.info(`[NotificationQueue] Batch complete: ${successful} success, ${failed} failed`);
  }

  /**
   * Processes a single notification job
   */
  private async processJob(job: QueueJob<NotificationPayload>): Promise<void> {
    const { userId, type, title, message, data } = job.message;

    try {
      // Create notification in database
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        type,
        title,
        message,
        data: data || {},
        read: false,
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`Failed to create notification: ${error.message}`);
      }

      // Delete message on success
      await this.client.delete(this.queueName, job.msg_id);

      logger.debug(`[NotificationQueue] Notification created: ${type} for user ${userId}`);
    } catch (error) {
      logger.error(`[NotificationQueue] Failed to process notification:`, error);

      // For notifications, we don't retry - just archive
      await this.client.archive(this.queueName, job.msg_id);

      throw error;
    }
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Helper function to create file processing notifications
 */
export const createFileProcessingNotification = (
  userId: string,
  fileId: string,
  fileName: string,
  success: boolean
): Omit<NotificationPayload, 'queuedAt'> => {
  if (success) {
    return {
      userId,
      type: 'file_processed',
      title: 'File Processing Complete',
      message: `Your file "${fileName}" has been successfully processed and is ready for use.`,
      data: { fileId, fileName },
      priority: mapPriorityToInteger('medium'),
    };
  } else {
    return {
      userId,
      type: 'file_failed',
      title: 'File Processing Failed',
      message: `We encountered an issue processing your file "${fileName}". Please try uploading again.`,
      data: { fileId, fileName },
      priority: mapPriorityToInteger('high'),
    };
  }
};
