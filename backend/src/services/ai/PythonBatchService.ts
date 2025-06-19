/**
 * Python-based Batch Processing Service
 * Replaces Node.js batch processing with Python AI service calls
 */

import { logger } from '../../utils/logger';
import { pythonAIClient, PythonAIClient, ContentGenerationRequest, CompletionRequest } from './PythonAIClient';
import { AIRequestType } from '../../types/ai';
import { UserPersona } from '../../types/persona';
import { CostTracker } from './CostTracker';

interface PythonBatchRequest<T = any> {
  id: string;
  userId: string;
  type: AIRequestType;
  params: T;
  priority?: number;
  metadata?: Record<string, any>;
}

interface PythonBatchResult<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

interface PythonBatchOptions {
  maxBatchSize?: number;
  maxWaitTime?: number;
  priorityGroups?: boolean;
  retryFailures?: boolean;
  costLimit?: number;
  useStreaming?: boolean;
}

export class PythonBatchService {
  private client: PythonAIClient;
  private costTracker: CostTracker;
  private queues: Map<string, any[]> = new Map();
  private processing: Set<string> = new Set();

  constructor(client: PythonAIClient = pythonAIClient, costTracker?: CostTracker) {
    this.client = client;
    this.costTracker = costTracker || new CostTracker();
  }

  /**
   * Process a batch of requests using Python AI service
   */
  async batchProcess<T>(
    requests: PythonBatchRequest<T>[],
    options: PythonBatchOptions = {}
  ): Promise<PythonBatchResult<T>[]> {
    const startTime = Date.now();
    logger.info('Python batch processing started', {
      requestCount: requests.length,
      types: requests.map(r => r.type)
    });

    try {
      // Group requests by type for optimal processing
      const grouped = this.groupRequestsByType(requests);
      const results: PythonBatchResult<T>[] = [];
      
      for (const [type, group] of grouped.entries()) {
        const batchResults = await this.processTypedBatch(type, group, options);
        results.push(...batchResults);
      }

      // Sort results back to original order
      const sortedResults = requests.map(req => 
        results.find(result => result.id === req.id) || {
          id: req.id,
          success: false,
          error: 'Result not found'
        }
      );

      const processingTime = Date.now() - startTime;
      logger.info('Python batch processing completed', {
        requestCount: requests.length,
        successCount: sortedResults.filter(r => r.success).length,
        processingTime
      });

      return sortedResults;
    } catch (error) {
      logger.error('Python batch processing error:', error);
      
      // Return error results for all requests
      return requests.map(req => ({
        id: req.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }

  /**
   * Process a batch of requests of the same type
   */
  private async processTypedBatch<T>(
    type: AIRequestType,
    requests: PythonBatchRequest<T>[],
    options: PythonBatchOptions
  ): Promise<PythonBatchResult<T>[]> {
    logger.debug(`Processing ${requests.length} requests of type ${type}`);

    switch (type) {
      case 'chat-completion':
        return this.processChatCompletionBatch(requests as PythonBatchRequest<any>[], options);
      
      case 'explain':
        return this.processContentGenerationBatch(requests as PythonBatchRequest<any>[], options);
      
      case 'embedding':
        return this.processEmbeddingBatch(requests as PythonBatchRequest<any>[], options);
      
      case 'summary':
        return this.processOutlineGenerationBatch(requests as PythonBatchRequest<any>[], options);
      
      default:
        // Process sequentially for unsupported types
        const results: PythonBatchResult<T>[] = [];
        for (const request of requests) {
          const result = await this.processSingleRequest(request, options);
          results.push(result);
        }
        return results;
    }
  }

  /**
   * Process chat completion batch
   */
  private async processChatCompletionBatch(
    requests: PythonBatchRequest<{ messages: any[]; model?: string; temperature?: number }>[],
    options: PythonBatchOptions
  ): Promise<PythonBatchResult[]> {
    const results: PythonBatchResult[] = [];

    try {
      // Process each chat completion (they don't batch well due to different contexts)
      for (const request of requests) {
        try {
          const completionRequest: CompletionRequest = {
            messages: request.params.messages,
            model: request.params.model,
            temperature: request.params.temperature || 0.7,
            stream: options.useStreaming || false,
            user_id: request.userId
          };

          let content = '';
          let totalTokens = 0;

          if (options.useStreaming) {
            // Streaming response
            for await (const chunk of this.client.complete(completionRequest)) {
              if (chunk.content) {
                content += chunk.content;
              }
              if (chunk.metadata?.usage) {
                totalTokens = chunk.metadata.usage.total_tokens || 0;
              }
            }
          } else {
            // Non-streaming response
            const generator = this.client.complete(completionRequest);
            for await (const chunk of generator) {
              if (chunk.content) {
                content += chunk.content;
              }
              if (chunk.metadata?.usage) {
                totalTokens = chunk.metadata.usage.total_tokens || 0;
              }
            }
          }

          results.push({
            id: request.id,
            success: true,
            data: content,
            usage: {
              promptTokens: Math.floor(totalTokens * 0.7), // Estimated split
              completionTokens: Math.floor(totalTokens * 0.3)
            }
          });

        } catch (error) {
          results.push({
            id: request.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Chat completion batch error:', error);
      return requests.map(req => ({
        id: req.id,
        success: false,
        error: error instanceof Error ? error.message : 'Batch processing failed'
      }));
    }
  }

  /**
   * Process content generation batch
   */
  private async processContentGenerationBatch(
    requests: PythonBatchRequest<{
      content: string;
      content_type: string;
      topic?: string;
      persona?: UserPersona;
      difficulty?: string;
    }>[],
    options: PythonBatchOptions
  ): Promise<PythonBatchResult[]> {
    const results: PythonBatchResult[] = [];

    for (const request of requests) {
      try {
        const generationRequest: ContentGenerationRequest = {
          content: request.params.content,
          content_type: request.params.content_type as any,
          topic: request.params.topic,
          difficulty: (request.params.difficulty as any) || 'intermediate',
          persona: request.params.persona,
          stream: options.useStreaming || false,
          user_id: request.userId
        };

        let generatedContent = '';
        for await (const chunk of this.client.generateContent(generationRequest)) {
          if (chunk.content) {
            generatedContent += chunk.content;
          }
        }

        results.push({
          id: request.id,
          success: true,
          data: generatedContent,
          usage: {
            promptTokens: Math.floor(request.params.content.length / 4), // Rough estimate
            completionTokens: Math.floor(generatedContent.length / 4)
          }
        });

      } catch (error) {
        results.push({
          id: request.id,
          success: false,
          error: error instanceof Error ? error.message : 'Content generation failed'
        });
      }
    }

    return results;
  }

  /**
   * Process embedding batch
   */
  private async processEmbeddingBatch(
    requests: PythonBatchRequest<{ texts: string | string[]; model?: string }>[],
    _options: PythonBatchOptions
  ): Promise<PythonBatchResult[]> {
    try {
      // Collect all texts for batch processing
      const batchItems = [];
      for (const request of requests) {
        const texts = Array.isArray(request.params.texts) 
          ? request.params.texts 
          : [request.params.texts];
        
        for (let i = 0; i < texts.length; i++) {
          batchItems.push({
            id: `${request.id}_${i}`,
            text: texts[i],
            metadata: { originalRequestId: request.id, index: i }
          });
        }
      }

      // Use batch embedding endpoint
      const batchResponse = await this.client.createBatchEmbeddings({
        items: batchItems,
        model: requests[0]?.params.model,
        batch_size: Math.min(50, batchItems.length),
        user_id: requests[0]?.userId
      });

      // Map results back to original requests
      const results: PythonBatchResult[] = [];
      const embeddingsByRequest = new Map<string, any[]>();

      for (const embedding of batchResponse.embeddings) {
        const originalRequestId = embedding.metadata.originalRequestId;
        if (!embeddingsByRequest.has(originalRequestId)) {
          embeddingsByRequest.set(originalRequestId, []);
        }
        embeddingsByRequest.get(originalRequestId)!.push(embedding.embedding);
      }

      for (const request of requests) {
        const embeddings = embeddingsByRequest.get(request.id) || [];
        results.push({
          id: request.id,
          success: embeddings.length > 0,
          data: embeddings,
          usage: {
            promptTokens: Math.floor(JSON.stringify(request.params.texts).length / 4),
            completionTokens: 0
          }
        });
      }

      return results;

    } catch (error) {
      logger.error('Embedding batch error:', error);
      return requests.map(req => ({
        id: req.id,
        success: false,
        error: error instanceof Error ? error.message : 'Embedding batch failed'
      }));
    }
  }

  /**
   * Process outline generation batch
   */
  private async processOutlineGenerationBatch(
    requests: PythonBatchRequest<{
      content: string;
      topic?: string;
      persona?: UserPersona;
    }>[],
    _options: PythonBatchOptions
  ): Promise<PythonBatchResult[]> {
    const results: PythonBatchResult[] = [];

    for (const request of requests) {
      try {
        const outlineRequest: ContentGenerationRequest = {
          content: request.params.content,
          content_type: 'outline',
          topic: request.params.topic || 'Document Analysis',
          difficulty: 'intermediate',
          persona: request.params.persona,
          stream: false, // Outlines don't need streaming
          user_id: request.userId
        };

        let outline = '';
        for await (const chunk of this.client.generateContent(outlineRequest)) {
          if (chunk.content) {
            outline += chunk.content;
          }
        }

        // Try to parse as JSON for structured outline
        let structuredOutline;
        try {
          structuredOutline = JSON.parse(outline);
        } catch {
          // If not valid JSON, return as text
          structuredOutline = { content: outline };
        }

        results.push({
          id: request.id,
          success: true,
          data: structuredOutline,
          usage: {
            promptTokens: Math.floor(request.params.content.length / 4),
            completionTokens: Math.floor(outline.length / 4)
          }
        });

      } catch (error) {
        results.push({
          id: request.id,
          success: false,
          error: error instanceof Error ? error.message : 'Outline generation failed'
        });
      }
    }

    return results;
  }

  /**
   * Process a single request (fallback)
   */
  private async processSingleRequest<T>(
    request: PythonBatchRequest<T>,
    _options: PythonBatchOptions
  ): Promise<PythonBatchResult<T>> {
    logger.warn(`Single request processing for type ${request.type} - consider implementing batch optimization`);
    
    try {
      // Basic fallback - treat as content generation
      const params = request.params as any;
      if (params.content && params.content_type) {
        const generationRequest: ContentGenerationRequest = {
          content: params.content,
          content_type: params.content_type,
          topic: params.topic,
          difficulty: params.difficulty || 'intermediate',
          persona: params.persona,
          stream: false,
          user_id: request.userId
        };

        let content = '';
        for await (const chunk of this.client.generateContent(generationRequest)) {
          if (chunk.content) {
            content += chunk.content;
          }
        }

        return {
          id: request.id,
          success: true,
          data: content as T,
          usage: {
            promptTokens: Math.floor(params.content.length / 4),
            completionTokens: Math.floor(content.length / 4)
          }
        };
      }

      return {
        id: request.id,
        success: false,
        error: `Unsupported request type: ${request.type}`
      };

    } catch (error) {
      return {
        id: request.id,
        success: false,
        error: error instanceof Error ? error.message : 'Single request failed'
      };
    }
  }

  /**
   * Group requests by type for optimal batching
   */
  private groupRequestsByType<T>(
    requests: PythonBatchRequest<T>[]
  ): Map<AIRequestType, PythonBatchRequest<T>[]> {
    const grouped = new Map<AIRequestType, PythonBatchRequest<T>[]>();
    
    for (const request of requests) {
      if (!grouped.has(request.type)) {
        grouped.set(request.type, []);
      }
      grouped.get(request.type)!.push(request);
    }
    
    return grouped;
  }

  /**
   * Get service health status
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.client.healthCheck();
    } catch (error) {
      logger.error('Python batch service health check failed:', error);
      return false;
    }
  }

  /**
   * Get batch processing statistics
   */
  async getStats(): Promise<Record<string, any>> {
    try {
      const pythonStats = await this.client.getStats();
      const costStats = await this.costTracker.getStats();
      
      return {
        pythonService: pythonStats,
        costs: costStats,
        queueStatus: {
          activeQueues: this.queues.size,
          processingQueues: this.processing.size
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get batch service stats:', error);
      return { error: 'Failed to retrieve stats' };
    }
  }
}

// Export singleton instance
export const pythonBatchService = new PythonBatchService();