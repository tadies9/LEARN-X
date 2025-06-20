/**
 * File Processing Queue Service
 * Optimized for high-throughput file processing with long-polling
 * Follows coding standards: Under 250 lines, single responsibility
 */

import { EnhancedPGMQClient, QueueJob } from './EnhancedPGMQClient';
import { ENHANCED_QUEUE_NAMES, mapPriorityToInteger } from '../../config/supabase-queue.config';
import { logger } from '../../utils/logger';
import { supabase } from '../../config/supabase';

export interface FileProcessingPayload {
  file_id: string;
  user_id: string;
  job_type?: string;
  processing_options?: {
    chunkSize?: number;
    priority?: number; // Use integer priorities
    [key: string]: unknown;
  };
  queued_at: string;
  retry_count?: number;
}

export interface FileProcessingMetrics {
  totalProcessed: number;
  totalFailed: number;
  averageProcessingTime: number;
  queueDepth: number;
}

export class FileProcessingQueue {
  private client: EnhancedPGMQClient;
  private queueName = ENHANCED_QUEUE_NAMES.FILE_PROCESSING;
  private isProcessing = false;
  private metrics: FileProcessingMetrics = {
    totalProcessed: 0,
    totalFailed: 0,
    averageProcessingTime: 0,
    queueDepth: 0,
  };

  constructor() {
    this.client = new EnhancedPGMQClient();
  }

  /**
   * Starts the file processing queue with long-polling
   */
  async start(): Promise<void> {
    try {
      // Ensure queue exists with proper configuration
      await this.client.createQueue(this.queueName);

      this.isProcessing = true;
      this.processWithLongPolling();

      logger.info('[FileProcessingQueue] Started with long-polling optimization');
    } catch (error) {
      logger.error('[FileProcessingQueue] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Enqueues a file for processing
   */
  async enqueue(
    fileId: string,
    userId: string,
    options?: FileProcessingPayload['processing_options']
  ): Promise<bigint> {
    try {
      const payload: FileProcessingPayload = {
        file_id: fileId,
        user_id: userId,
        job_type: 'process_file',
        processing_options: options || {},
        queued_at: new Date().toISOString(),
        retry_count: 0,
      };

      const msgId = await this.client.send(this.queueName, payload);

      logger.info(`[FileProcessingQueue] Enqueued file processing: ${fileId}`, {
        msgId: msgId.toString(),
        userId,
        priority: options?.priority || mapPriorityToInteger('medium'),
      });

      return msgId;
    } catch (error) {
      logger.error(`[FileProcessingQueue] Failed to enqueue file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Enqueues multiple files for batch processing
   */
  async enqueueBatch(
    files: Array<{
      fileId: string;
      userId: string;
      options?: FileProcessingPayload['processing_options'];
    }>
  ): Promise<bigint[]> {
    try {
      const payloads: FileProcessingPayload[] = files.map((file) => ({
        file_id: file.fileId,
        user_id: file.userId,
        job_type: 'process_file',
        processing_options: file.options || {},
        queued_at: new Date().toISOString(),
        retry_count: 0,
      }));

      const msgIds = await this.client.sendBatch(this.queueName, payloads);

      logger.info(`[FileProcessingQueue] Enqueued batch: ${files.length} files`, {
        msgIds: msgIds.map((id) => id.toString()),
      });

      return msgIds;
    } catch (error) {
      logger.error('[FileProcessingQueue] Failed to enqueue batch:', error);
      throw error;
    }
  }

  /**
   * Gets current queue metrics
   */
  async getMetrics(): Promise<FileProcessingMetrics> {
    try {
      const queueMetrics = await this.client.getQueueMetrics(this.queueName);

      if (queueMetrics) {
        this.metrics.queueDepth = queueMetrics.queue_length;
      }

      return { ...this.metrics };
    } catch (error) {
      logger.error('[FileProcessingQueue] Failed to get metrics:', error);
      return { ...this.metrics };
    }
  }

  /**
   * Adds generation tasks for batch content generation
   */
  async addGenerationTasks(
    tasks: Array<{
      jobId: string;
      fileId: string;
      outputType: string;
      userId: string;
      courseId: string;
      personaId?: string;
      options?: Record<string, any>;
    }>
  ): Promise<bigint[]> {
    try {
      const payloads = tasks.map((task) => ({
        file_id: task.fileId,
        user_id: task.userId,
        job_type: 'generate_content',
        processing_options: {
          jobId: task.jobId,
          outputType: task.outputType,
          courseId: task.courseId,
          personaId: task.personaId,
          ...task.options,
          priority: mapPriorityToInteger('high'), // High priority for user-facing generation
        },
        queued_at: new Date().toISOString(),
        retry_count: 0,
      }));

      const msgIds = await this.client.sendBatch(this.queueName, payloads);

      logger.info(`[FileProcessingQueue] Enqueued generation tasks: ${tasks.length}`, {
        jobId: tasks[0]?.jobId,
        msgIds: msgIds.map((id) => id.toString()),
      });

      return msgIds;
    } catch (error) {
      logger.error('[FileProcessingQueue] Failed to enqueue generation tasks:', error);
      throw error;
    }
  }

  /**
   * Stops the queue processing
   */
  async stop(): Promise<void> {
    this.isProcessing = false;
    logger.info('[FileProcessingQueue] Stopped processing');
  }

  /**
   * Main processing loop with long-polling optimization
   */
  private async processWithLongPolling(): Promise<void> {
    while (this.isProcessing) {
      try {
        // Use long-polling to reduce database load
        const jobs = await this.client.readWithPoll(this.queueName, 30);

        if (jobs.length > 0) {
          await this.processBatch(jobs as QueueJob<FileProcessingPayload>[]);
        }

        // Small delay between poll cycles to prevent overwhelming
        await this.sleep(1000);
      } catch (error) {
        logger.error('[FileProcessingQueue] Processing error:', error);

        // Longer delay on error to allow recovery
        await this.sleep(5000);
      }
    }
  }

  /**
   * Processes a batch of file processing jobs
   */
  private async processBatch(jobs: QueueJob<FileProcessingPayload>[]): Promise<void> {
    logger.info(`[FileProcessingQueue] Processing batch: ${jobs.length} jobs`);

    const results = await Promise.allSettled(jobs.map((job) => this.processJob(job)));

    // Update metrics
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    this.metrics.totalProcessed += successful;
    this.metrics.totalFailed += failed;

    logger.info(`[FileProcessingQueue] Batch complete: ${successful} success, ${failed} failed`);
  }

  /**
   * Processes a single file processing job
   */
  private async processJob(job: QueueJob<FileProcessingPayload>): Promise<void> {
    const startTime = Date.now();
    const { file_id, user_id } = job.message;

    try {
      logger.info(`[FileProcessingQueue] Processing file: ${file_id}`, {
        msgId: job.msg_id.toString(),
        userId: user_id,
        attempt: job.read_ct,
      });

      // Mark job as started in enhanced job tracking
      await this.markJobStarted(job.msg_id);

      // Import dynamically to avoid circular dependencies
      const { FileProcessor } = await import('../processing/FileProcessor');
      const processor = new FileProcessor();

      // Process the file
      await processor.processJob(job);

      // Delete message on success
      await this.client.delete(this.queueName, job.msg_id);

      // Mark job as completed in enhanced job tracking
      const processingTime = Date.now() - startTime;
      await this.markJobCompleted(job.msg_id, processingTime);

      // Update metrics
      this.updateAverageProcessingTime(processingTime);

      logger.info(`[FileProcessingQueue] File processed successfully: ${file_id}`, {
        processingTimeMs: processingTime,
        msgId: job.msg_id.toString(),
      });
    } catch (error) {
      logger.error(`[FileProcessingQueue] Failed to process file ${file_id}:`, error);

      // Check if we should retry or archive
      const shouldRetry = this.shouldRetryJob(job, error);

      if (shouldRetry) {
        // Let the message become visible again for retry
        logger.warn(`[FileProcessingQueue] Job will retry: ${file_id}`, {
          attempt: job.read_ct,
          msgId: job.msg_id.toString(),
        });
      } else {
        // Mark job as failed in enhanced job tracking
        await this.markJobFailed(
          job.msg_id,
          error instanceof Error ? error.message : 'Unknown error'
        );

        // Archive the failed job for analysis
        await this.client.archive(this.queueName, job.msg_id);

        logger.error(`[FileProcessingQueue] Job archived after failure: ${file_id}`, {
          attempt: job.read_ct,
          msgId: job.msg_id.toString(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      throw error;
    }
  }

  /**
   * Determines if a job should be retried based on error type and attempt count
   */
  private shouldRetryJob(job: QueueJob<FileProcessingPayload>, error: unknown): boolean {
    const maxRetries = 3;
    const isRetryableError = this.isRetryableError(error);

    return job.read_ct < maxRetries && isRetryableError;
  }

  /**
   * Checks if an error is retryable (transient vs permanent)
   */
  private isRetryableError(error: unknown): boolean {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';

    // Retryable errors (transient issues)
    const retryablePatterns = [
      'timeout',
      'connection',
      'network',
      'rate limit',
      'temporarily unavailable',
      'service unavailable',
    ];

    // Non-retryable errors (permanent issues)
    const nonRetryablePatterns = [
      'file not found',
      'access denied',
      'invalid file format',
      'corrupted file',
      'unsupported file type',
    ];

    // Check for non-retryable errors first
    if (nonRetryablePatterns.some((pattern) => errorMessage.includes(pattern))) {
      return false;
    }

    // Check for retryable errors
    if (retryablePatterns.some((pattern) => errorMessage.includes(pattern))) {
      return true;
    }

    // Default to retryable for unknown errors
    return true;
  }

  /**
   * Updates the average processing time metric
   */
  private updateAverageProcessingTime(newTime: number): void {
    const totalJobs = this.metrics.totalProcessed + this.metrics.totalFailed;
    if (totalJobs === 0) {
      this.metrics.averageProcessingTime = newTime;
    } else {
      this.metrics.averageProcessingTime =
        (this.metrics.averageProcessingTime * (totalJobs - 1) + newTime) / totalJobs;
    }
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Mark job as started in enhanced job tracking
   */
  private async markJobStarted(messageId: bigint): Promise<void> {
    try {
      const workerId = process.env.WORKER_ID || `enhanced-pgmq-${process.pid}`;
      const { error } = await supabase.rpc('mark_enhanced_job_started', {
        p_message_id: messageId,
        p_worker_id: workerId,
      });

      if (error) {
        logger.warn(`[FileProcessingQueue] Failed to mark job as started: ${error.message}`);
      }
    } catch (error) {
      logger.warn('[FileProcessingQueue] Error marking job as started:', error);
    }
  }

  /**
   * Mark job as completed in enhanced job tracking
   */
  private async markJobCompleted(messageId: bigint, processingTimeMs: number): Promise<void> {
    try {
      const { error } = await supabase.rpc('mark_enhanced_job_completed', {
        p_message_id: messageId,
        p_processing_time_ms: processingTimeMs,
      });

      if (error) {
        logger.warn(`[FileProcessingQueue] Failed to mark job as completed: ${error.message}`);
      }
    } catch (error) {
      logger.warn('[FileProcessingQueue] Error marking job as completed:', error);
    }
  }

  /**
   * Mark job as failed in enhanced job tracking
   */
  private async markJobFailed(messageId: bigint, errorMessage: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('mark_enhanced_job_failed', {
        p_message_id: messageId,
        p_error_message: errorMessage,
        p_should_retry: true,
      });

      if (error) {
        logger.warn(`[FileProcessingQueue] Failed to mark job as failed: ${error.message}`);
      }
    } catch (error) {
      logger.warn('[FileProcessingQueue] Error marking job as failed:', error);
    }
  }
}
