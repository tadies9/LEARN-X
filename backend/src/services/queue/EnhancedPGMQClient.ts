/**
 * Enhanced PGMQ Client with Supabase optimizations
 * Follows coding standards: Under 300 lines, single responsibility
 */

import { supabase } from '../../config/supabase';
import { getQueueConfig, QueueName, QueueSettings } from '../../config/supabase-queue.config';
import { logger } from '../../utils/logger';

export interface QueueJob<T = any> {
  msg_id: bigint;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  message: T;
}

export interface QueueMetrics {
  queue_name: string;
  queue_length: number;
  newest_msg_age_sec: number | null;
  oldest_msg_age_sec: number | null;
  total_messages: number;
}

export interface BatchEnqueueOptions {
  delay?: number;
  priority?: number;
}

export class EnhancedPGMQClient {
  private config = getQueueConfig();
  private initialized = new Set<string>();

  /**
   * Creates a queue with the specified configuration
   */
  async createQueue(queueName: QueueName): Promise<void> {
    if (this.initialized.has(queueName)) {
      return;
    }

    const queueConfig = this.config.queues[queueName];
    if (!queueConfig) {
      throw new Error(`Queue configuration not found: ${queueName}`);
    }

    try {
      let rpcFunction: string;
      let params: any = { queue_name: queueName };

      switch (queueConfig.type) {
        case 'unlogged':
          rpcFunction = 'pgmq.create_unlogged';
          break;
        case 'partitioned':
          rpcFunction = 'pgmq.create_partitioned';
          params.partition_interval = queueConfig.partitionInterval;
          params.retention_interval = queueConfig.retentionInterval;
          break;
        default:
          rpcFunction = 'pgmq.create';
      }

      const { error } = await supabase.rpc(rpcFunction, params);

      if (error && !error.message.includes('already exists')) {
        throw error;
      }

      this.initialized.add(queueName);
      logger.info(`[EnhancedPGMQ] Created ${queueConfig.type} queue: ${queueName}`);
    } catch (error) {
      logger.error(`[EnhancedPGMQ] Failed to create queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Sends a single message to the queue
   */
  async send<T>(
    queueName: QueueName,
    message: T,
    delay = 0
  ): Promise<bigint> {
    await this.ensureQueueExists(queueName);

    try {
      const { data, error } = await supabase.rpc('pgmq.send', {
        queue_name: queueName,
        msg: message,
        delay: delay
      });

      if (error) throw error;

      logger.debug(`[EnhancedPGMQ] Message sent to ${queueName}: ${data}`);
      return data;
    } catch (error) {
      logger.error(`[EnhancedPGMQ] Failed to send message to ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Sends multiple messages to the queue in a single batch
   */
  async sendBatch<T>(
    queueName: QueueName,
    messages: T[],
    options: BatchEnqueueOptions = {}
  ): Promise<bigint[]> {
    await this.ensureQueueExists(queueName);

    if (messages.length === 0) {
      return [];
    }

    try {
      const { data, error } = await supabase.rpc('pgmq.send_batch', {
        queue_name: queueName,
        msgs: messages,
        delay: options.delay || 0
      });

      if (error) throw error;

      logger.info(`[EnhancedPGMQ] Batch sent to ${queueName}: ${messages.length} messages`);
      return data;
    } catch (error) {
      logger.error(`[EnhancedPGMQ] Failed to send batch to ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Reads messages from the queue with long polling support
   */
  async readWithPoll<T>(
    queueName: QueueName,
    maxPollSeconds = 30
  ): Promise<QueueJob<T>[]> {
    await this.ensureQueueExists(queueName);

    const queueConfig = this.config.queues[queueName];
    if (!queueConfig?.longPolling) {
      return this.read(queueName);
    }

    try {
      const { data, error } = await supabase.rpc('pgmq.read_with_poll', {
        queue_name: queueName,
        vt: queueConfig.visibilityTimeout,
        qty: queueConfig.batchSize,
        max_poll_seconds: maxPollSeconds
      });

      if (error) throw error;

      const jobs = data || [];
      if (jobs.length > 0) {
        logger.debug(`[EnhancedPGMQ] Read ${jobs.length} messages from ${queueName} (long-poll)`);
      }

      return jobs;
    } catch (error) {
      logger.error(`[EnhancedPGMQ] Failed to read with poll from ${queueName}:`, error);
      return [];
    }
  }

  /**
   * Reads messages from the queue
   */
  async read<T>(queueName: QueueName): Promise<QueueJob<T>[]> {
    await this.ensureQueueExists(queueName);

    const queueConfig = this.config.queues[queueName];

    try {
      const { data, error } = await supabase.rpc('pgmq.read', {
        queue_name: queueName,
        vt: queueConfig.visibilityTimeout,
        qty: queueConfig.batchSize
      });

      if (error) throw error;

      const jobs = data || [];
      if (jobs.length > 0) {
        logger.debug(`[EnhancedPGMQ] Read ${jobs.length} messages from ${queueName}`);
      }

      return jobs;
    } catch (error) {
      logger.error(`[EnhancedPGMQ] Failed to read from ${queueName}:`, error);
      return [];
    }
  }

  /**
   * Deletes a single message from the queue
   */
  async delete(queueName: QueueName, msgId: bigint): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('pgmq.delete', {
        queue_name: queueName,
        msg_id: msgId
      });

      if (error) throw error;

      logger.debug(`[EnhancedPGMQ] Deleted message ${msgId} from ${queueName}`);
      return data;
    } catch (error) {
      logger.error(`[EnhancedPGMQ] Failed to delete message ${msgId} from ${queueName}:`, error);
      return false;
    }
  }

  /**
   * Deletes multiple messages from the queue
   */
  async deleteBatch(queueName: QueueName, msgIds: bigint[]): Promise<bigint[]> {
    if (msgIds.length === 0) return [];

    try {
      const { data, error } = await supabase.rpc('pgmq.delete', {
        queue_name: queueName,
        msg_ids: msgIds
      });

      if (error) throw error;

      logger.info(`[EnhancedPGMQ] Deleted ${data.length} messages from ${queueName}`);
      return data;
    } catch (error) {
      logger.error(`[EnhancedPGMQ] Failed to delete batch from ${queueName}:`, error);
      return [];
    }
  }

  /**
   * Archives a message (moves to archive table instead of deleting)
   */
  async archive(queueName: QueueName, msgId: bigint): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('pgmq.archive', {
        queue_name: queueName,
        msg_id: msgId
      });

      if (error) throw error;

      logger.debug(`[EnhancedPGMQ] Archived message ${msgId} from ${queueName}`);
      return data;
    } catch (error) {
      logger.error(`[EnhancedPGMQ] Failed to archive message ${msgId} from ${queueName}:`, error);
      return false;
    }
  }

  /**
   * Archives multiple messages
   */
  async archiveBatch(queueName: QueueName, msgIds: bigint[]): Promise<bigint[]> {
    if (msgIds.length === 0) return [];

    try {
      const { data, error } = await supabase.rpc('pgmq.archive', {
        queue_name: queueName,
        msg_ids: msgIds
      });

      if (error) throw error;

      logger.info(`[EnhancedPGMQ] Archived ${data.length} messages from ${queueName}`);
      return data;
    } catch (error) {
      logger.error(`[EnhancedPGMQ] Failed to archive batch from ${queueName}:`, error);
      return [];
    }
  }

  /**
   * Gets queue metrics and statistics
   */
  async getQueueMetrics(queueName: QueueName): Promise<QueueMetrics | null> {
    try {
      const { data, error } = await supabase.rpc('pgmq.metrics', {
        queue_name: queueName
      });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error(`[EnhancedPGMQ] Failed to get metrics for ${queueName}:`, error);
      return null;
    }
  }

  /**
   * Gets metrics for all queues
   */
  async getAllQueueMetrics(): Promise<QueueMetrics[]> {
    try {
      const { data, error } = await supabase.rpc('pgmq.metrics_all');

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('[EnhancedPGMQ] Failed to get all queue metrics:', error);
      return [];
    }
  }

  /**
   * Purges all messages from a queue
   */
  async purge(queueName: QueueName): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('pgmq.purge_queue', {
        queue_name: queueName
      });

      if (error) throw error;

      logger.warn(`[EnhancedPGMQ] Purged ${data} messages from ${queueName}`);
      return data;
    } catch (error) {
      logger.error(`[EnhancedPGMQ] Failed to purge ${queueName}:`, error);
      return 0;
    }
  }

  /**
   * Ensures queue exists before operations
   */
  private async ensureQueueExists(queueName: QueueName): Promise<void> {
    if (!this.initialized.has(queueName)) {
      await this.createQueue(queueName);
    }
  }
}

// Export singleton instance
export const enhancedPGMQClient = new EnhancedPGMQClient();