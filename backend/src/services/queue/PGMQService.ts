import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface JobPayload {
  jobId?: string;
  jobType: string;
  payload: any;
}

export interface JobOptions {
  delay?: number; // Delay in seconds
  priority?: number;
  maxAttempts?: number;
}

export interface Job {
  id: string;
  messageId?: bigint;
  queueName: string;
  jobType: string;
  payload: any;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'dead';
  attempts: number;
  createdAt: Date;
  error?: string;
}

export class PGMQService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isShuttingDown = false;

  constructor() {
    // Handle graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  /**
   * Enqueue a job to the specified queue
   */
  async enqueue(
    queueName: string,
    jobType: string,
    payload: any,
    options: JobOptions = {}
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('enqueue_job', {
        p_queue_name: queueName,
        p_job_type: jobType,
        p_payload: payload,
        p_delay_seconds: options.delay || 0,
      });

      if (error) {
        throw error;
      }

      logger.info(`[PGMQ] Job enqueued`, {
        queueName,
        jobType,
        jobId: data,
      });

      return data;
    } catch (error) {
      logger.error('[PGMQ] Failed to enqueue job', {
        queueName,
        jobType,
        error,
      });
      throw error;
    }
  }

  /**
   * Process jobs from a queue
   */
  async processQueue(
    queueName: string,
    handler: (job: Job) => Promise<void>,
    options: {
      batchSize?: number;
      pollInterval?: number;
      visibilityTimeout?: number;
    } = {}
  ): Promise<void> {
    const {
      batchSize = 1,
      pollInterval = 1000,
      visibilityTimeout = 30,
    } = options;

    logger.info(`[PGMQ] Starting processor for queue: ${queueName}`);

    const poll = async () => {
      if (this.isShuttingDown) {
        return;
      }

      try {
        // Read messages from queue using wrapper function
        const { data: messagesJson, error } = await supabase.rpc('pgmq_read', {
          queue_name: queueName,
          vt: visibilityTimeout,
          qty: batchSize,
        });

        if (error) {
          throw error;
        }

        // Parse JSON response from wrapper function
        const messages = messagesJson && Array.isArray(messagesJson) ? messagesJson : [];

        if (messages && messages.length > 0) {
          await Promise.all(
            messages.map(async (message: any) => {
              const job = this.messageToJob(queueName, message);
              
              try {
                // Mark job as started
                await this.markJobStarted(job.id);
                
                // Process the job
                await handler(job);
                
                // Delete message from queue using wrapper function
                await this.deleteMessage(queueName, message.msg_id);
                
                // Mark job as completed
                await this.markJobCompleted(job.id);
                
                logger.info(`[PGMQ] Job completed`, {
                  queueName,
                  jobId: job.id,
                });
              } catch (error) {
                logger.error(`[PGMQ] Job failed`, {
                  queueName,
                  jobId: job.id,
                  error: error instanceof Error ? error.message : String(error),
                  errorStack: error instanceof Error ? error.stack : undefined,
                });
                
                // Mark job as failed
                await this.markJobFailed(
                  job.id,
                  error instanceof Error ? error.message : 'Unknown error'
                );
                
                // Check if message is poison
                const isPoisonMessage = await this.checkPoisonMessage(job.id);
                
                if (isPoisonMessage) {
                  // Archive the poison message using wrapper function
                  await this.archiveMessage(queueName, message.msg_id);
                  logger.warn(`[PGMQ] Poison message archived`, {
                    queueName,
                    jobId: job.id,
                  });
                }
              }
            })
          );
        }
      } catch (error) {
        logger.error(`[PGMQ] Error processing queue ${queueName}:`, error);
      }

      // Schedule next poll
      if (!this.isShuttingDown) {
        const timeoutId = setTimeout(poll, pollInterval);
        this.pollingIntervals.set(queueName, timeoutId);
      }
    };

    // Start polling
    poll();
  }

  /**
   * Stop processing a specific queue
   */
  stopProcessing(queueName: string): void {
    const timeoutId = this.pollingIntervals.get(queueName);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.pollingIntervals.delete(queueName);
      logger.info(`[PGMQ] Stopped processing queue: ${queueName}`);
    }
  }

  /**
   * Get queue health metrics
   */
  async getQueueHealth(): Promise<any[]> {
    try {
      // Use the new wrapper function instead of direct view access
      const { data, error } = await supabase.rpc('get_queue_metrics');

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('[PGMQ] Failed to get queue health', error);
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    try {
      const { data, error } = await supabase
        .from('job_tracking')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        throw error;
      }

      return data ? this.transformJob(data) : null;
    } catch (error) {
      logger.error('[PGMQ] Failed to get job', { jobId, error });
      throw error;
    }
  }

  /**
   * Retry failed jobs
   */
  async retryFailedJobs(queueName: string, limit: number = 10): Promise<number> {
    try {
      const { data: failedJobs, error } = await supabase
        .from('job_tracking')
        .select('*')
        .eq('queue_name', queueName)
        .eq('status', 'failed')
        .lt('attempts', 'max_attempts')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        throw error;
      }

      if (!failedJobs || failedJobs.length === 0) {
        return 0;
      }

      // Re-enqueue failed jobs
      for (const job of failedJobs) {
        await this.enqueue(
          job.queue_name,
          job.job_type,
          job.payload,
          { delay: Math.min(job.attempts * 5, 60) } // Exponential backoff
        );
      }

      return failedJobs.length;
    } catch (error) {
      logger.error('[PGMQ] Failed to retry jobs', { queueName, error });
      throw error;
    }
  }

  /**
   * Clean up old completed/dead jobs
   */
  async cleanupOldJobs(daysToKeep: number = 7): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_jobs', {
        p_days_to_keep: daysToKeep,
      });

      if (error) {
        throw error;
      }

      logger.info(`[PGMQ] Cleaned up ${data} old jobs`);
      return data;
    } catch (error) {
      logger.error('[PGMQ] Failed to cleanup old jobs', error);
      throw error;
    }
  }

  // Private helper methods

  private messageToJob(queueName: string, message: any): Job {
    const messageData = message.message;
    return {
      id: messageData.job_id || uuidv4(),
      messageId: message.msg_id,
      queueName,
      jobType: messageData.job_type,
      payload: messageData.payload,
      status: 'processing',
      attempts: 1,
      createdAt: new Date(message.enqueued_at),
    };
  }

  private transformJob(data: any): Job {
    return {
      id: data.id,
      messageId: data.message_id,
      queueName: data.queue_name,
      jobType: data.job_type,
      payload: data.payload,
      status: data.status,
      attempts: data.attempts,
      createdAt: new Date(data.created_at),
      error: data.error_message,
    };
  }

  private async markJobStarted(jobId: string): Promise<void> {
    const { error } = await supabase.rpc('mark_job_started', {
      p_job_id: jobId,
    });

    if (error) {
      logger.error('[PGMQ] Failed to mark job as started', { jobId, error });
    }
  }

  private async markJobCompleted(jobId: string, result?: any): Promise<void> {
    const { error } = await supabase.rpc('mark_job_completed', {
      p_job_id: jobId,
      p_result: result,
    });

    if (error) {
      logger.error('[PGMQ] Failed to mark job as completed', { jobId, error });
    }
  }

  private async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    const { error } = await supabase.rpc('mark_job_failed', {
      p_job_id: jobId,
      p_error_message: errorMessage,
    });

    if (error) {
      logger.error('[PGMQ] Failed to mark job as failed', { jobId, error });
    }
  }

  private async checkPoisonMessage(jobId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_poison_message', {
        p_job_id: jobId,
      });

      if (error) {
        throw error;
      }

      return data || false;
    } catch (error) {
      logger.error('[PGMQ] Failed to check poison message', { jobId, error });
      return false;
    }
  }

  private async deleteMessage(queueName: string, messageId: bigint): Promise<void> {
    const { error } = await supabase.rpc('pgmq_delete', {
      queue_name: queueName,
      msg_id: messageId,
    });

    if (error) {
      logger.error('[PGMQ] Failed to delete message', { queueName, messageId, error });
    }
  }

  private async archiveMessage(queueName: string, messageId: bigint): Promise<void> {
    const { error } = await supabase.rpc('pgmq_archive', {
      queue_name: queueName,
      msg_id: messageId,
    });

    if (error) {
      logger.error('[PGMQ] Failed to archive message', { queueName, messageId, error });
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('[PGMQ] Shutting down...');
    this.isShuttingDown = true;

    // Stop all polling
    for (const [queueName, timeoutId] of this.pollingIntervals) {
      clearTimeout(timeoutId);
      logger.info(`[PGMQ] Stopped polling for queue: ${queueName}`);
    }

    this.pollingIntervals.clear();
  }
}

// Export singleton instance
export const pgmqService = new PGMQService();