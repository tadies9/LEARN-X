import { OpenAI } from 'openai';
import { logger } from '../../utils/logger';
import { openAICircuitBreaker } from '../ai/CircuitBreaker';
import { CostTracker } from '../ai/CostTracker';
import { TokenCounter } from '../ai/TokenCounter';
import { AIRequestType } from '../../types/ai';

interface BatchRequest<T = any> {
  id: string;
  userId: string;
  type: AIRequestType;
  params: T;
  priority?: number;
  metadata?: Record<string, any>;
}

interface BatchResult<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

interface BatchOptions {
  maxBatchSize?: number;
  maxWaitTime?: number; // milliseconds
  priorityGroups?: boolean;
  retryFailures?: boolean;
  costLimit?: number;
}

interface QueuedRequest<T = any> extends BatchRequest<T> {
  timestamp: number;
  resolver: (result: BatchResult<T>) => void;
  rejecter: (error: Error) => void;
}

export class BatchProcessingService {
  private openai: OpenAI;
  private costTracker: CostTracker;
  private queues: Map<string, QueuedRequest[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private processing: Set<string> = new Set();

  constructor(openai: OpenAI, costTracker: CostTracker) {
    this.openai = openai;
    this.costTracker = costTracker;
  }

  /**
   * Add a request to the batch queue
   */
  async addToBatch<T>(
    request: BatchRequest<T>,
    options: BatchOptions = {}
  ): Promise<BatchResult<T>> {
    const {
      maxBatchSize = 10,
      maxWaitTime = 1000,
      priorityGroups = true,
    } = options;

    return new Promise((resolve, reject) => {
      const queueKey = this.getQueueKey(request.type, priorityGroups ? request.priority : undefined);
      
      const queuedRequest: QueuedRequest<T> = {
        ...request,
        timestamp: Date.now(),
        resolver: resolve,
        rejecter: reject,
      };

      // Add to queue
      if (!this.queues.has(queueKey)) {
        this.queues.set(queueKey, []);
      }
      this.queues.get(queueKey)!.push(queuedRequest);

      // Check if we should process immediately
      const queue = this.queues.get(queueKey)!;
      if (queue.length >= maxBatchSize) {
        this.processBatch(queueKey, options);
      } else {
        // Set timer for max wait time
        this.scheduleProcessing(queueKey, maxWaitTime, options);
      }
    });
  }

  /**
   * Process a batch of similar requests
   */
  async batchOpenAIRequests<T>(
    requests: BatchRequest<T>[],
    options: BatchOptions = {}
  ): Promise<BatchResult<T>[]> {
    const results: BatchResult<T>[] = [];
    
    try {
      // Group requests by type for optimal batching
      const grouped = this.groupRequestsByType(requests);
      
      for (const [type, group] of grouped.entries()) {
        const batchResults = await this.processTypedBatch(type, group, options);
        results.push(...batchResults);
      }
      
      return results;
    } catch (error) {
      logger.error('Batch processing error:', error);
      
      // Return error results for all requests
      return requests.map(req => ({
        id: req.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }

  /**
   * Process a batch of requests of the same type
   */
  private async processTypedBatch<T>(
    type: AIRequestType,
    requests: BatchRequest<T>[],
    options: BatchOptions
  ): Promise<BatchResult<T>[]> {
    const results: BatchResult<T>[] = [];
    
    // Check cost limits
    if (options.costLimit) {
      const estimatedCost = await this.estimateBatchCost(requests);
      if (estimatedCost > options.costLimit) {
        throw new Error(`Batch cost (${estimatedCost}) exceeds limit (${options.costLimit})`);
      }
    }

    // Process based on request type
    switch (type) {
      case 'chat-completion':
        return this.processChatBatch(requests as BatchRequest<any>[], options);
      
      case 'embedding':
        return this.processEmbeddingBatch(requests as BatchRequest<any>[], options);
      
      case 'moderation':
        return this.processModerationBatch(requests as BatchRequest<any>[], options);
      
      default:
        // Fallback to sequential processing for unsupported types
        for (const request of requests) {
          const result = await this.processSingleRequest(request, options);
          results.push(result);
        }
        return results;
    }
  }

  /**
   * Process a batch of chat completions
   */
  private async processChatBatch(
    requests: BatchRequest<{ messages: any[]; model: string }>[],
    _options: BatchOptions
  ): Promise<BatchResult[]> {
    // const _results: BatchResult[] = [];
    
    try {
      // Use circuit breaker
      const responses = await openAICircuitBreaker.execute(async () => {
        // For chat completions, we need to process sequentially
        // but we can optimize by reusing context
        const batchResponses = [];
        
        for (const request of requests) {
          const startTime = Date.now();
          
          try {
            const response = await this.openai.chat.completions.create({
              ...request.params,
              stream: false,
            });
            
            const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0 };
            
            // Track cost
            await this.costTracker.trackRequest({
              userId: request.userId,
              requestType: 'chat-completion',
              model: request.params.model,
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              responseTimeMs: Date.now() - startTime,
              cacheHit: false,
            });
            
            batchResponses.push({
              id: request.id,
              success: true,
              data: response.choices[0].message.content,
              usage: {
                promptTokens: usage.prompt_tokens,
                completionTokens: usage.completion_tokens,
              },
            });
          } catch (error) {
            batchResponses.push({
              id: request.id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
        
        return batchResponses;
      });
      
      return responses;
    } catch (error) {
      logger.error('Chat batch processing error:', error);
      
      // Return error for all requests
      return requests.map(req => ({
        id: req.id,
        success: false,
        error: error instanceof Error ? error.message : 'Circuit breaker open',
      }));
    }
  }

  /**
   * Process a batch of embeddings
   */
  private async processEmbeddingBatch(
    requests: BatchRequest<{ input: string | string[]; model: string }>[],
    _options: BatchOptions
  ): Promise<BatchResult[]> {
    try {
      // Combine all inputs for batch processing
      const allInputs: string[] = [];
      const inputMapping: Map<number, { requestId: string; userId: string }> = new Map();
      let index = 0;
      
      for (const request of requests) {
        const inputs = Array.isArray(request.params.input) 
          ? request.params.input 
          : [request.params.input];
        
        for (const input of inputs) {
          allInputs.push(input);
          inputMapping.set(index++, { 
            requestId: request.id, 
            userId: request.userId 
          });
        }
      }
      
      // Process all embeddings in one call
      const startTime = Date.now();
      const response = await openAICircuitBreaker.execute(async () => {
        return this.openai.embeddings.create({
          model: requests[0].params.model || 'text-embedding-ada-002',
          input: allInputs,
        });
      });
      
      const usage = response.usage || { prompt_tokens: 0, total_tokens: 0 };
      
      // Track cost for the batch
      await this.costTracker.trackRequest({
        userId: 'batch-processing',
        requestType: 'embedding',
        model: requests[0].params.model || 'text-embedding-ada-002',
        promptTokens: usage.prompt_tokens,
        completionTokens: 0,
        responseTimeMs: Date.now() - startTime,
        cacheHit: false,
      });
      
      // Map results back to requests
      const results: BatchResult[] = [];
      const embeddingsByRequest = new Map<string, any[]>();
      
      response.data.forEach((embedding, idx) => {
        const mapping = inputMapping.get(idx);
        if (mapping) {
          if (!embeddingsByRequest.has(mapping.requestId)) {
            embeddingsByRequest.set(mapping.requestId, []);
          }
          embeddingsByRequest.get(mapping.requestId)!.push(embedding);
        }
      });
      
      for (const request of requests) {
        const embeddings = embeddingsByRequest.get(request.id) || [];
        results.push({
          id: request.id,
          success: true,
          data: embeddings,
          usage: {
            promptTokens: Math.floor(usage.prompt_tokens / requests.length),
            completionTokens: 0,
          },
        });
      }
      
      return results;
    } catch (error) {
      logger.error('Embedding batch processing error:', error);
      
      return requests.map(req => ({
        id: req.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }

  /**
   * Process a batch of moderation requests
   */
  private async processModerationBatch(
    requests: BatchRequest<{ input: string | string[] }>[],
    _options: BatchOptions
  ): Promise<BatchResult[]> {
    try {
      // Combine all inputs
      const allInputs: string[] = [];
      const inputMapping: Map<number, string> = new Map();
      let index = 0;
      
      for (const request of requests) {
        const inputs = Array.isArray(request.params.input) 
          ? request.params.input 
          : [request.params.input];
        
        for (const input of inputs) {
          allInputs.push(input);
          inputMapping.set(index++, request.id);
        }
      }
      
      // Process moderation in batch
      const response = await this.openai.moderations.create({
        input: allInputs,
      });
      
      // Map results back
      const resultsByRequest = new Map<string, any[]>();
      
      response.results.forEach((result, idx) => {
        const requestId = inputMapping.get(idx);
        if (requestId) {
          if (!resultsByRequest.has(requestId)) {
            resultsByRequest.set(requestId, []);
          }
          resultsByRequest.get(requestId)!.push(result);
        }
      });
      
      return requests.map(request => ({
        id: request.id,
        success: true,
        data: resultsByRequest.get(request.id) || [],
      }));
    } catch (error) {
      logger.error('Moderation batch processing error:', error);
      
      return requests.map(req => ({
        id: req.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }

  /**
   * Process a single request (fallback)
   */
  private async processSingleRequest<T>(
    request: BatchRequest<T>,
    _options: BatchOptions
  ): Promise<BatchResult<T>> {
    try {
      // This is a placeholder - implement based on request type
      logger.warn(`Single request processing for type ${request.type} not implemented`);
      
      return {
        id: request.id,
        success: false,
        error: 'Single request processing not implemented for this type',
      };
    } catch (error) {
      return {
        id: request.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Group requests by type
   */
  private groupRequestsByType<T>(
    requests: BatchRequest<T>[]
  ): Map<AIRequestType, BatchRequest<T>[]> {
    const grouped = new Map<AIRequestType, BatchRequest<T>[]>();
    
    for (const request of requests) {
      if (!grouped.has(request.type)) {
        grouped.set(request.type, []);
      }
      grouped.get(request.type)!.push(request);
    }
    
    return grouped;
  }

  /**
   * Estimate batch processing cost
   */
  private async estimateBatchCost<T>(requests: BatchRequest<T>[]): Promise<number> {
    let totalCost = 0;
    
    for (const request of requests) {
      // Estimate tokens based on request type and params
      const estimatedTokens = this.estimateTokens(request);
      const costPerToken = 0.00002; // Average estimate
      totalCost += estimatedTokens * costPerToken;
    }
    
    return totalCost;
  }

  /**
   * Estimate tokens for a request
   */
  private estimateTokens<T>(request: BatchRequest<T>): number {
    // Simple estimation - in production, use proper token counting
    const params = request.params as any;
    
    if (request.type === 'chat-completion' && params.messages) {
      const messageText = params.messages.map((m: any) => m.content).join(' ');
      return TokenCounter.estimateTokens(messageText);
    }
    
    if (request.type === 'embedding' && params.input) {
      const text = Array.isArray(params.input) ? params.input.join(' ') : params.input;
      return TokenCounter.estimateTokens(text);
    }
    
    return 100; // Default estimate
  }

  /**
   * Get queue key for grouping
   */
  private getQueueKey(type: AIRequestType, priority?: number): string {
    return priority !== undefined ? `${type}:p${priority}` : type;
  }

  /**
   * Schedule batch processing
   */
  private scheduleProcessing(queueKey: string, maxWaitTime: number, options: BatchOptions): void {
    // Clear existing timer
    if (this.timers.has(queueKey)) {
      clearTimeout(this.timers.get(queueKey)!);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.processBatch(queueKey, options);
    }, maxWaitTime);
    
    this.timers.set(queueKey, timer);
  }

  /**
   * Process a queued batch
   */
  private async processBatch(queueKey: string, options: BatchOptions): Promise<void> {
    // Prevent concurrent processing
    if (this.processing.has(queueKey)) {
      return;
    }
    
    this.processing.add(queueKey);
    
    // Clear timer
    if (this.timers.has(queueKey)) {
      clearTimeout(this.timers.get(queueKey)!);
      this.timers.delete(queueKey);
    }
    
    // Get and clear queue
    const queue = this.queues.get(queueKey) || [];
    this.queues.set(queueKey, []);
    
    if (queue.length === 0) {
      this.processing.delete(queueKey);
      return;
    }
    
    try {
      // Convert to batch requests
      const batchRequests = queue.map(q => ({
        id: q.id,
        userId: q.userId,
        type: q.type,
        params: q.params,
        priority: q.priority,
        metadata: q.metadata,
      }));
      
      // Process batch
      const results = await this.batchOpenAIRequests(batchRequests, options);
      
      // Resolve promises
      queue.forEach((request, index) => {
        const result = results[index];
        if (result.success) {
          request.resolver(result);
        } else {
          request.rejecter(new Error(result.error || 'Unknown error'));
        }
      });
    } catch (error) {
      // Reject all promises
      queue.forEach(request => {
        request.rejecter(error instanceof Error ? error : new Error('Batch processing failed'));
      });
    } finally {
      this.processing.delete(queueKey);
    }
  }
}

// Export singleton
let batchProcessingService: BatchProcessingService | null = null;

export function getBatchProcessingService(
  openai: OpenAI,
  costTracker: CostTracker
): BatchProcessingService {
  if (!batchProcessingService) {
    batchProcessingService = new BatchProcessingService(openai, costTracker);
  }
  return batchProcessingService;
}