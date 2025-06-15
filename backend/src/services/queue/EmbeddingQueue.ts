/**
 * Embedding Generation Queue Service
 * Optimized for high-volume API-based embedding generation
 * Follows coding standards: Under 250 lines, single responsibility
 */

import { EnhancedPGMQClient, QueueJob } from './EnhancedPGMQClient';
import { ENHANCED_QUEUE_NAMES } from '../../config/supabase-queue.config';
import { logger } from '../../utils/logger';

export interface EmbeddingPayload {
  fileId: string;
  userId: string;
  chunks: Array<{
    id: string;
    content: string;
    position: number;
    metadata?: Record<string, any>;
  }>;
  model?: string;
  queuedAt: string;
}

export interface EmbeddingMetrics {
  totalEmbeddings: number;
  totalFailed: number;
  averageApiTime: number;
  queueDepth: number;
  costEstimate: number;
}

export class EmbeddingQueue {
  private client: EnhancedPGMQClient;
  private queueName = ENHANCED_QUEUE_NAMES.EMBEDDING_GENERATION;
  private isProcessing = false;
  private metrics: EmbeddingMetrics = {
    totalEmbeddings: 0,
    totalFailed: 0,
    averageApiTime: 0,
    queueDepth: 0,
    costEstimate: 0
  };

  constructor() {
    this.client = new EnhancedPGMQClient();
  }

  /**
   * Starts the embedding queue with optimized polling
   */
  async start(): Promise<void> {
    try {
      // Ensure partitioned queue exists for high volume
      await this.client.createQueue(this.queueName);
      
      this.isProcessing = true;
      this.processWithOptimizedPolling();
      
      logger.info('[EmbeddingQueue] Started with partitioned queue optimization');
    } catch (error) {
      logger.error('[EmbeddingQueue] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Enqueues embeddings for a single file's chunks
   */
  async enqueue(
    fileId: string,
    chunks: EmbeddingPayload['chunks'],
    userId: string,
    model = 'text-embedding-3-small'
  ): Promise<bigint> {
    try {
      const payload: EmbeddingPayload = {
        fileId,
        userId,
        chunks,
        model,
        queuedAt: new Date().toISOString()
      };

      const msgId = await this.client.send(this.queueName, payload);
      
      logger.info(`[EmbeddingQueue] Enqueued embedding generation: ${fileId}`, {
        msgId: msgId.toString(),
        chunkCount: chunks.length,
        model
      });

      return msgId;
    } catch (error) {
      logger.error(`[EmbeddingQueue] Failed to enqueue embeddings for ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Enqueues multiple files for batch embedding generation
   */
  async enqueueBatch(
    fileId: string,
    chunks: EmbeddingPayload['chunks'],
    userId: string,
    model = 'text-embedding-3-small'
  ): Promise<bigint[]> {
    try {
      // Split into smaller batches to optimize API calls
      const batchSize = 10; // Optimal batch size for OpenAI API
      const batches: EmbeddingPayload[] = [];
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batchChunks = chunks.slice(i, i + batchSize);
        batches.push({
          fileId,
          userId,
          chunks: batchChunks,
          model,
          queuedAt: new Date().toISOString()
        });
      }

      const msgIds = await this.client.sendBatch(this.queueName, batches);
      
      logger.info(`[EmbeddingQueue] Enqueued embedding batches: ${fileId}`, {
        totalChunks: chunks.length,
        batches: batches.length,
        msgIds: msgIds.map(id => id.toString())
      });

      return msgIds;
    } catch (error) {
      logger.error(`[EmbeddingQueue] Failed to enqueue batch for ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Gets current queue metrics
   */
  async getMetrics(): Promise<EmbeddingMetrics> {
    try {
      const queueMetrics = await this.client.getQueueMetrics(this.queueName);
      
      if (queueMetrics) {
        this.metrics.queueDepth = queueMetrics.queue_length;
      }

      return { ...this.metrics };
    } catch (error) {
      logger.error('[EmbeddingQueue] Failed to get metrics:', error);
      return { ...this.metrics };
    }
  }

  /**
   * Stops the queue processing
   */
  async stop(): Promise<void> {
    this.isProcessing = false;
    logger.info('[EmbeddingQueue] Stopped processing');
  }

  /**
   * Main processing loop with optimized polling for API workloads
   */
  private async processWithOptimizedPolling(): Promise<void> {
    let backoffMultiplier = 1;
    const baseInterval = 1000; // 1 second base interval
    const maxBackoff = 30000; // 30 seconds max

    while (this.isProcessing) {
      try {
        // Use long-polling for efficiency
        const jobs = await this.client.readWithPoll(this.queueName, 30);
        
        if (jobs.length === 0) {
          // Exponential backoff when queue is empty
          const delay = Math.min(baseInterval * backoffMultiplier, maxBackoff);
          backoffMultiplier = Math.min(backoffMultiplier * 1.5, 16);
          await this.sleep(delay);
        } else {
          // Reset backoff on activity
          backoffMultiplier = 1;
          await this.processBatch(jobs);
          await this.sleep(baseInterval);
        }
        
      } catch (error) {
        logger.error('[EmbeddingQueue] Processing error:', error);
        await this.sleep(baseInterval * 2);
      }
    }
  }

  /**
   * Processes a batch of embedding jobs
   */
  private async processBatch(jobs: QueueJob<EmbeddingPayload>[]): Promise<void> {
    logger.info(`[EmbeddingQueue] Processing batch: ${jobs.length} jobs`);

    // Process jobs with controlled concurrency to respect API limits
    const concurrency = 3; // Limit concurrent API calls
    const results: Array<{ success: boolean; chunks: number }> = [];

    for (let i = 0; i < jobs.length; i += concurrency) {
      const batch = jobs.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(job => this.processJob(job))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push({ success: true, chunks: result.value });
        } else {
          results.push({ success: false, chunks: 0 });
        }
      }
    }

    // Update metrics
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalChunks = results.reduce((sum, r) => sum + r.chunks, 0);
    
    this.metrics.totalEmbeddings += totalChunks;
    this.metrics.totalFailed += failed;
    
    logger.info(`[EmbeddingQueue] Batch complete: ${successful} success, ${failed} failed, ${totalChunks} embeddings`);
  }

  /**
   * Processes a single embedding job
   */
  private async processJob(job: QueueJob<EmbeddingPayload>): Promise<number> {
    const startTime = Date.now();
    const { fileId, chunks } = job.message;

    try {
      logger.info(`[EmbeddingQueue] Processing embeddings: ${fileId}`, {
        msgId: job.msg_id.toString(),
        chunkCount: chunks.length,
        attempt: job.read_ct
      });

      // Import dynamically to avoid circular dependencies
      const { VectorEmbeddingService } = await import('../embeddings/VectorEmbeddingService');
      const embeddingService = new VectorEmbeddingService();
      
      // Process embeddings for the chunks
      await embeddingService.processBatch(chunks, job.message.userId);
      
      // Delete message on success
      await this.client.delete(this.queueName, job.msg_id);
      
      // Update metrics
      const apiTime = Date.now() - startTime;
      this.updateAverageApiTime(apiTime);
      this.updateCostEstimate(chunks.length);
      
      logger.info(`[EmbeddingQueue] Embeddings processed successfully: ${fileId}`, {
        apiTimeMs: apiTime,
        chunkCount: chunks.length,
        msgId: job.msg_id.toString()
      });
      
      return chunks.length;
      
    } catch (error) {
      logger.error(`[EmbeddingQueue] Failed to process embeddings ${fileId}:`, error);
      
      // Check if we should retry or archive
      const shouldRetry = this.shouldRetryJob(job, error);
      
      if (shouldRetry) {
        // Let the message become visible again for retry
        logger.warn(`[EmbeddingQueue] Job will retry: ${fileId}`, {
          attempt: job.read_ct,
          msgId: job.msg_id.toString()
        });
      } else {
        // Archive the failed job for analysis
        await this.client.archive(this.queueName, job.msg_id);
        
        logger.error(`[EmbeddingQueue] Job archived after failure: ${fileId}`, {
          attempt: job.read_ct,
          msgId: job.msg_id.toString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      throw error;
    }
  }

  /**
   * Determines if a job should be retried
   */
  private shouldRetryJob(job: QueueJob<EmbeddingPayload>, error: any): boolean {
    const maxRetries = 5; // More retries for API failures
    const isRetryableError = this.isRetryableError(error);
    
    return job.read_ct < maxRetries && isRetryableError;
  }

  /**
   * Checks if an error is retryable (API-specific logic)
   */
  private isRetryableError(error: any): boolean {
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
    
    // Retryable API errors
    const retryablePatterns = [
      'rate limit',
      'timeout',
      'service unavailable',
      'temporary failure',
      'connection reset',
      'network error'
    ];
    
    // Non-retryable API errors
    const nonRetryablePatterns = [
      'invalid api key',
      'quota exceeded',
      'content policy violation',
      'invalid input'
    ];
    
    if (nonRetryablePatterns.some(pattern => errorMessage.includes(pattern))) {
      return false;
    }
    
    if (retryablePatterns.some(pattern => errorMessage.includes(pattern))) {
      return true;
    }
    
    // Default to retryable for unknown API errors
    return true;
  }

  /**
   * Updates the average API time metric
   */
  private updateAverageApiTime(newTime: number): void {
    const totalJobs = this.metrics.totalEmbeddings + this.metrics.totalFailed;
    if (totalJobs === 0) {
      this.metrics.averageApiTime = newTime;
    } else {
      this.metrics.averageApiTime = 
        (this.metrics.averageApiTime * (totalJobs - 1) + newTime) / totalJobs;
    }
  }

  /**
   * Updates the cost estimate based on token usage
   */
  private updateCostEstimate(chunkCount: number): void {
    // Estimate: ~500 tokens per chunk, $0.00002 per 1K tokens
    const estimatedTokens = chunkCount * 500;
    const estimatedCost = (estimatedTokens / 1000) * 0.00002;
    this.metrics.costEstimate += estimatedCost;
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}