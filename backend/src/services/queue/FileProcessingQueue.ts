/**
 * File Processing Queue Service
 * Optimized for high-throughput file processing with long-polling
 * Follows coding standards: Under 250 lines, single responsibility
 */

import { EnhancedPGMQClient, QueueJob } from './EnhancedPGMQClient';
import { ENHANCED_QUEUE_NAMES } from '../../config/supabase-queue.config';
import { logger } from '../../utils/logger';

export interface FileProcessingPayload {
  fileId: string;
  userId: string;
  processingOptions?: {
    chunkSize?: number;
    priority?: 'low' | 'medium' | 'high';
    [key: string]: any;
  };
  queuedAt: string;
  retryCount?: number;
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
    queueDepth: 0
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
    options?: FileProcessingPayload['processingOptions']
  ): Promise<bigint> {
    try {
      const payload: FileProcessingPayload = {
        fileId,
        userId,
        processingOptions: options || {},
        queuedAt: new Date().toISOString(),
        retryCount: 0
      };

      const msgId = await this.client.send(this.queueName, payload);
      
      logger.info(`[FileProcessingQueue] Enqueued file processing: ${fileId}`, {
        msgId: msgId.toString(),
        userId,
        priority: options?.priority || 'medium'
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
    files: Array<{ fileId: string; userId: string; options?: FileProcessingPayload['processingOptions'] }>
  ): Promise<bigint[]> {
    try {
      const payloads: FileProcessingPayload[] = files.map(file => ({
        fileId: file.fileId,
        userId: file.userId,
        processingOptions: file.options || {},
        queuedAt: new Date().toISOString(),
        retryCount: 0
      }));

      const msgIds = await this.client.sendBatch(this.queueName, payloads);
      
      logger.info(`[FileProcessingQueue] Enqueued batch: ${files.length} files`, {
        msgIds: msgIds.map(id => id.toString())
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
          await this.processBatch(jobs);
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

    const results = await Promise.allSettled(
      jobs.map(job => this.processJob(job))
    );

    // Update metrics
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    this.metrics.totalProcessed += successful;
    this.metrics.totalFailed += failed;
    
    logger.info(`[FileProcessingQueue] Batch complete: ${successful} success, ${failed} failed`);
  }

  /**
   * Processes a single file processing job
   */
  private async processJob(job: QueueJob<FileProcessingPayload>): Promise<void> {
    const startTime = Date.now();
    const { fileId, userId } = job.message;

    try {
      logger.info(`[FileProcessingQueue] Processing file: ${fileId}`, {
        msgId: job.msg_id.toString(),
        userId,
        attempt: job.read_ct
      });

      // Import dynamically to avoid circular dependencies
      const { FileProcessor } = await import('../processing/FileProcessor');
      const processor = new FileProcessor();
      
      // Process the file
      await processor.processJob(job);
      
      // Delete message on success
      await this.client.delete(this.queueName, job.msg_id);
      
      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateAverageProcessingTime(processingTime);
      
      logger.info(`[FileProcessingQueue] File processed successfully: ${fileId}`, {
        processingTimeMs: processingTime,
        msgId: job.msg_id.toString()
      });
      
    } catch (error) {
      logger.error(`[FileProcessingQueue] Failed to process file ${fileId}:`, error);
      
      // Check if we should retry or archive
      const shouldRetry = this.shouldRetryJob(job, error);
      
      if (shouldRetry) {
        // Let the message become visible again for retry
        logger.warn(`[FileProcessingQueue] Job will retry: ${fileId}`, {
          attempt: job.read_ct,
          msgId: job.msg_id.toString()
        });
      } else {
        // Archive the failed job for analysis
        await this.client.archive(this.queueName, job.msg_id);
        
        logger.error(`[FileProcessingQueue] Job archived after failure: ${fileId}`, {
          attempt: job.read_ct,
          msgId: job.msg_id.toString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      throw error;
    }
  }

  /**
   * Determines if a job should be retried based on error type and attempt count
   */
  private shouldRetryJob(job: QueueJob<FileProcessingPayload>, error: any): boolean {
    const maxRetries = 3;
    const isRetryableError = this.isRetryableError(error);
    
    return job.read_ct < maxRetries && isRetryableError;
  }

  /**
   * Checks if an error is retryable (transient vs permanent)
   */
  private isRetryableError(error: any): boolean {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
    
    // Retryable errors (transient issues)
    const retryablePatterns = [
      'timeout',
      'connection',
      'network',
      'rate limit',
      'temporarily unavailable',
      'service unavailable'
    ];
    
    // Non-retryable errors (permanent issues)
    const nonRetryablePatterns = [
      'file not found',
      'access denied',
      'invalid file format',
      'corrupted file',
      'unsupported file type'
    ];
    
    // Check for non-retryable errors first
    if (nonRetryablePatterns.some(pattern => errorMessage.includes(pattern))) {
      return false;
    }
    
    // Check for retryable errors
    if (retryablePatterns.some(pattern => errorMessage.includes(pattern))) {
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
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}