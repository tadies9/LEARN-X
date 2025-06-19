/**
 * Python-based Vector Embedding Service
 * Replaces OpenAI direct calls with Python AI service for better optimization
 */

import { logger } from '../../utils/logger';
import { pythonAIClient, PythonAIClient, EmbeddingRequest, BatchEmbeddingRequest } from '../ai/PythonAIClient';
import { supabase } from '../../config/supabase';

export interface PythonEmbeddingChunk {
  id: string;
  fileId: string;
  content: string;
  position: number;
  metadata?: Record<string, any>;
  embedding?: number[];
}

export interface PythonEmbeddingResult {
  chunkId: string;
  embedding: number[];
  model: string;
  cached: boolean;
  processingTime: number;
}

export interface BatchEmbeddingResult {
  embeddings: PythonEmbeddingResult[];
  totalTokens: number;
  processingTime: number;
  cacheHitRate: number;
  model: string;
}

export class PythonEmbeddingService {
  private client: PythonAIClient;
  private model: string = 'text-embedding-3-small';
  private dimensions: number = 1536;
  private batchSize: number = 50;

  constructor(client: PythonAIClient = pythonAIClient) {
    this.client = client;
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(
    text: string, 
    userId?: string,
    model?: string
  ): Promise<number[]> {
    const startTime = Date.now();
    
    try {
      const request: EmbeddingRequest = {
        texts: text,
        model: model || this.model,
        dimensions: this.dimensions,
        user_id: userId
      };

      const response = await this.client.createEmbeddings(request);
      const embedding = response.embeddings[0];

      const processingTime = Date.now() - startTime;
      logger.info('Python single embedding generated', {
        userId,
        model: response.model,
        textLength: text.length,
        processingTime
      });

      return embedding;

    } catch (error) {
      logger.error('Python single embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts with optimization
   */
  async generateEmbeddings(
    texts: string[], 
    userId?: string,
    model?: string
  ): Promise<number[][]> {
    const startTime = Date.now();
    
    try {
      const request: EmbeddingRequest = {
        texts,
        model: model || this.model,
        dimensions: this.dimensions,
        user_id: userId
      };

      const response = await this.client.createEmbeddings(request);

      const processingTime = Date.now() - startTime;
      logger.info('Python batch embeddings generated', {
        userId,
        model: response.model,
        count: texts.length,
        processingTime
      });

      return response.embeddings;

    } catch (error) {
      logger.error('Python batch embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Process chunks with advanced batching and optimization
   */
  async processBatch(
    chunks: PythonEmbeddingChunk[], 
    userId: string,
    model?: string
  ): Promise<BatchEmbeddingResult> {
    const startTime = Date.now();
    
    try {
      // Prepare batch request with metadata
      const items = chunks.map(chunk => ({
        id: chunk.id,
        text: chunk.content,
        metadata: {
          fileId: chunk.fileId,
          position: chunk.position,
          ...chunk.metadata
        }
      }));

      const request: BatchEmbeddingRequest = {
        items,
        model: model || this.model,
        dimensions: this.dimensions,
        batch_size: this.batchSize,
        user_id: userId
      };

      const response = await this.client.createBatchEmbeddings(request);

      // Map results back to chunks
      const results: PythonEmbeddingResult[] = response.embeddings.map(item => ({
        chunkId: item.id,
        embedding: item.embedding,
        model: response.model,
        cached: false, // Python service handles cache detection
        processingTime: 0 // Individual timing not available in batch
      }));

      const totalProcessingTime = Date.now() - startTime;
      
      logger.info('Python batch chunk processing completed', {
        userId,
        model: response.model,
        totalChunks: chunks.length,
        processedItems: response.total_items,
        processingTime: totalProcessingTime
      });

      return {
        embeddings: results,
        totalTokens: 0, // Python service calculates internally
        processingTime: totalProcessingTime,
        cacheHitRate: 0, // Python service tracks internally
        model: response.model
      };

    } catch (error) {
      logger.error('Python batch chunk processing failed:', error);
      throw error;
    }
  }

  /**
   * Store embeddings in the database
   */
  async storeEmbeddings(
    results: PythonEmbeddingResult[],
    model?: string
  ): Promise<void> {
    try {
      const embeddingData = results.map(result => ({
        chunk_id: result.chunkId,
        embedding: result.embedding,
        model: result.model,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('chunk_embeddings')
        .upsert(embeddingData, { 
          onConflict: 'chunk_id',
          ignoreDuplicates: false 
        });

      if (error) {
        throw error;
      }

      logger.info('Python embeddings stored in database', {
        count: results.length,
        model: model || this.model
      });

    } catch (error) {
      logger.error('Failed to store Python embeddings:', error);
      throw error;
    }
  }

  /**
   * Process file chunks and store embeddings
   */
  async processFileChunks(
    fileId: string,
    chunks: Array<{
      id: string;
      content: string;
      position: number;
      metadata?: Record<string, any>;
    }>,
    userId: string,
    model?: string
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Convert to PythonEmbeddingChunk format
      const embeddingChunks: PythonEmbeddingChunk[] = chunks.map(chunk => ({
        ...chunk,
        fileId
      }));

      // Process in batches
      const batchResults = await this.processBatch(embeddingChunks, userId, model);

      // Store embeddings in database
      await this.storeEmbeddings(batchResults.embeddings, model);

      // Update file processing status
      await this.updateFileEmbeddingStatus(fileId, 'completed');

      const totalProcessingTime = Date.now() - startTime;
      logger.info('Python file chunk processing completed', {
        fileId,
        userId,
        totalChunks: chunks.length,
        model: batchResults.model,
        processingTime: totalProcessingTime
      });

    } catch (error) {
      logger.error('Python file chunk processing failed:', error);
      
      // Update file status to failed
      await this.updateFileEmbeddingStatus(fileId, 'failed');
      throw error;
    }
  }

  /**
   * Search for similar content using embeddings
   */
  async searchSimilar(
    queryText: string,
    userId: string,
    options: {
      topK?: number;
      threshold?: number;
      fileIds?: string[];
      model?: string;
    } = {}
  ): Promise<Array<{
    chunkId: string;
    content: string;
    similarity: number;
    metadata?: Record<string, any>;
  }>> {
    const startTime = Date.now();
    
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(
        queryText, 
        userId, 
        options.model
      );

      // Search in database using vector similarity
      let query = supabase.rpc('search_chunks_by_embedding', {
        query_embedding: queryEmbedding,
        similarity_threshold: options.threshold || 0.7,
        match_count: options.topK || 10
      });

      // Filter by file IDs if provided
      if (options.fileIds?.length) {
        query = query.in('file_id', options.fileIds);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const processingTime = Date.now() - startTime;
      logger.info('Python similarity search completed', {
        userId,
        queryLength: queryText.length,
        resultsCount: data?.length || 0,
        processingTime
      });

      return data || [];

    } catch (error) {
      logger.error('Python similarity search failed:', error);
      throw error;
    }
  }

  /**
   * Update file embedding processing status
   */
  private async updateFileEmbeddingStatus(
    fileId: string, 
    status: 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('uploaded_files')
        .update({ 
          embedding_status: status,
          embedding_updated_at: new Date().toISOString()
        })
        .eq('id', fileId);

      if (error) {
        throw error;
      }

    } catch (error) {
      logger.error('Failed to update file embedding status:', error);
      // Don't throw here as this is not critical to the main operation
    }
  }

  /**
   * Get embedding statistics from Python service
   */
  async getEmbeddingStats(): Promise<Record<string, any>> {
    try {
      const stats = await this.client.getStats();
      return stats.embeddings || {};
    } catch (error) {
      logger.error('Failed to get Python embedding stats:', error);
      return { error: 'Failed to retrieve stats' };
    }
  }

  /**
   * Health check for the embedding service
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.client.healthCheck();
    } catch (error) {
      logger.error('Python embedding service health check failed:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<Record<string, any>> {
    try {
      const stats = await this.client.getStats();
      return stats.cache || {};
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return { error: 'Failed to retrieve cache stats' };
    }
  }

  /**
   * Clear embedding cache (if needed for maintenance)
   */
  async clearCache(): Promise<void> {
    try {
      // This would need to be implemented in the Python service
      logger.info('Cache clear requested for Python embedding service');
    } catch (error) {
      logger.error('Failed to clear embedding cache:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const pythonEmbeddingService = new PythonEmbeddingService();