import { openAIService } from '../openai/OpenAIService';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { TokenCounter } from '../ai/TokenCounter';
import { CostTracker } from '../ai/CostTracker';
import { AIRequestType } from '../../types/ai';

export interface Chunk {
  id: string;
  fileId: string;
  content: string;
  position: number;
  metadata?: Record<string, any>;
}

export interface Embedding {
  chunkId: string;
  embedding: number[];
  model: string;
}

export class VectorEmbeddingService {
  private model: string = 'text-embedding-3-small';
  private dimensions: number = 1536;
  private batchSize: number = 50;
  private maxConcurrent: number = 3;
  private costTracker: CostTracker;

  constructor() {
    this.costTracker = new CostTracker();
  }

  async generateEmbedding(text: string, userId?: string): Promise<number[]> {
    try {
      const startTime = Date.now();
      const tokens = TokenCounter.countTokens(text, this.model);

      const response = await openAIService.getClient().embeddings.create({
        model: this.model,
        input: text,
        dimensions: this.dimensions,
      });

      const embedding = response.data[0].embedding;

      // Track cost if userId provided
      if (userId) {
        await this.costTracker.trackRequest({
          userId,
          requestType: AIRequestType.EMBEDDING,
          model: this.model,
          promptTokens: tokens,
          completionTokens: 0,
          responseTimeMs: Date.now() - startTime,
        });
      }

      return embedding;
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  async generateEmbeddings(texts: string[], userId?: string): Promise<number[][]> {
    try {
      const startTime = Date.now();
      const totalTokens = texts.reduce(
        (sum, text) => sum + TokenCounter.countTokens(text, this.model),
        0
      );

      const response = await openAIService.getClient().embeddings.create({
        model: this.model,
        input: texts,
        dimensions: this.dimensions,
      });

      const embeddings = response.data.map((d) => d.embedding);

      // Track cost if userId provided
      if (userId) {
        await this.costTracker.trackRequest({
          userId,
          requestType: AIRequestType.EMBEDDING,
          model: this.model,
          promptTokens: totalTokens,
          completionTokens: 0,
          responseTimeMs: Date.now() - startTime,
        });
      }

      return embeddings;
    } catch (error) {
      logger.error('Failed to generate embeddings batch:', error);
      throw error;
    }
  }

  async processBatch(chunks: Chunk[], userId: string): Promise<void> {
    logger.info(`Processing ${chunks.length} chunks for embeddings`);

    // Process in batches to avoid API limits
    const batches: Chunk[][] = [];
    for (let i = 0; i < chunks.length; i += this.batchSize) {
      batches.push(chunks.slice(i, i + this.batchSize));
    }

    // Process batches with simple concurrency control
    for (let i = 0; i < batches.length; i += this.maxConcurrent) {
      const concurrentBatches = batches.slice(i, i + this.maxConcurrent);
      
      const promises = concurrentBatches.map(async (batch, idx) => {
        try {
          const texts = batch.map((chunk) => chunk.content);
          const embeddings = await this.generateEmbeddings(texts, userId);
          await this.storeEmbeddings(batch, embeddings);

          logger.info(
            `Processed batch ${i + idx + 1}/${batches.length}`
          );
        } catch (error) {
          logger.error(`Failed to process batch ${i + idx + 1}:`, error);
          throw error;
        }
      });

      await Promise.all(promises);
    }

    logger.info('Completed embedding generation for all chunks');
  }

  private async storeEmbeddings(chunks: Chunk[], embeddings: number[][]): Promise<void> {
    try {
      // Prepare data for insertion into file_embeddings table
      const embeddingRecords = chunks.map((chunk, index) => ({
        chunk_id: chunk.id,
        embedding: embeddings[index], // Pass as array, not string
        model_version: this.model,
      }));

      // Store embeddings in the new vector table
      // Note: file_embeddings table doesn't have file_id column
      const { error: insertError } = await supabase
        .from('file_embeddings')
        .insert(embeddingRecords);

      if (insertError) {
        throw insertError;
      }

      // Update chunk metadata for each chunk individually to avoid null file_id issues
      for (const chunk of chunks) {
        // First verify the chunk exists
        const { data: existingChunk, error: fetchError } = await supabase
          .from('file_chunks')
          .select('id, file_id, chunk_metadata')
          .eq('id', chunk.id)
          .single();

        if (fetchError || !existingChunk) {
          logger.error(`Chunk ${chunk.id} not found for update:`, fetchError);
          throw new Error(`Chunk ${chunk.id} not found in database`);
        }

        // Merge existing metadata with new embedding metadata
        const updatedMetadata = {
          ...(existingChunk.chunk_metadata || {}),
          ...(chunk.metadata || {}),
          embedding_model: this.model,
          embedding_generated_at: new Date().toISOString(),
          has_embedding: true,
        };

        const { data: updateResult, error: updateError } = await supabase
          .from('file_chunks')
          .update({
            chunk_metadata: updatedMetadata,
          })
          .eq('id', chunk.id)
          .select('id');

        if (updateError) {
          logger.error(`Failed to update metadata for chunk ${chunk.id}:`, updateError);
          throw updateError;
        }

        if (!updateResult || updateResult.length === 0) {
          logger.error(`No rows updated for chunk ${chunk.id}`);
          throw new Error(`Failed to update chunk ${chunk.id} - no rows affected`);
        }

        logger.debug(`Successfully updated metadata for chunk ${chunk.id}`);
      }

      logger.info(`Stored ${embeddings.length} embeddings in file_embeddings table`);
    } catch (error) {
      logger.error('Failed to store embeddings:', error);
      throw error;
    }
  }

  async getFileEmbeddings(fileId: string): Promise<Embedding[]> {
    try {
      const { data, error } = await supabase
        .from('file_embeddings')
        .select(
          `
          chunk_id,
          embedding,
          model_version,
          file_chunks!inner(
            file_id
          )
        `
        )
        .eq('file_chunks.file_id', fileId);

      if (error) {
        throw error;
      }

      return data.map((record) => ({
        chunkId: record.chunk_id,
        embedding: Array.isArray(record.embedding)
          ? record.embedding
          : JSON.parse(record.embedding),
        model: record.model_version,
      }));
    } catch (error) {
      logger.error('Failed to get file embeddings:', error);
      throw error;
    }
  }

  async deleteFileEmbeddings(fileId: string): Promise<void> {
    try {
      // Get chunk IDs for the file
      const { data: chunks, error: chunkError } = await supabase
        .from('file_chunks')
        .select('id')
        .eq('file_id', fileId);

      if (chunkError) {
        throw chunkError;
      }

      if (chunks && chunks.length > 0) {
        const chunkIds = chunks.map((c) => c.id);

        // Delete embeddings for these chunks
        const { error } = await supabase.from('file_embeddings').delete().in('chunk_id', chunkIds);

        if (error) {
          throw error;
        }
      }

      logger.info(`Deleted embeddings for file ${fileId}`);
    } catch (error) {
      logger.error('Failed to delete file embeddings:', error);
      throw error;
    }
  }

  async checkEmbeddingsExist(fileId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('file_embeddings')
        .select('chunk_id', { count: 'exact', head: true })
        .eq('file_chunks.file_id', fileId)
        .not('file_chunks', 'is', null);

      if (error) {
        // Fallback to checking via chunks
        const { data: chunks } = await supabase
          .from('file_chunks')
          .select('id')
          .eq('file_id', fileId)
          .limit(1);

        if (chunks && chunks.length > 0) {
          const { count: embCount } = await supabase
            .from('file_embeddings')
            .select('*', { count: 'exact', head: true })
            .eq('chunk_id', chunks[0].id);

          return (embCount || 0) > 0;
        }
        return false;
      }

      return (count || 0) > 0;
    } catch (error) {
      logger.error('Failed to check embeddings existence:', error);
      return false;
    }
  }

  async searchSimilarChunks(
    queryEmbedding: number[],
    options: {
      matchCount?: number;
      fileIdFilter?: string;
      threshold?: number;
    } = {}
  ): Promise<
    Array<{
      chunkId: string;
      content: string;
      metadata: any;
      similarity: number;
      fileId: string;
    }>
  > {
    try {
      const { matchCount = 10, fileIdFilter, threshold = 0.7 } = options;

      // Format embedding for PostgreSQL
      const embeddingStr = `[${queryEmbedding.join(',')}]`;

      // Use the SQL function we created
      const { data, error } = await supabase.rpc('search_similar_chunks', {
        query_embedding: embeddingStr,
        match_count: matchCount,
        file_id_filter: fileIdFilter,
      });

      if (error) {
        throw error;
      }

      // Filter by threshold if specified
      return (data || [])
        .filter((result: any) => result.similarity >= threshold)
        .map((result: any) => ({
          chunkId: result.chunk_id,
          content: result.content,
          metadata: result.chunk_metadata,
          similarity: result.similarity,
          fileId: result.file_id,
        }));
    } catch (error) {
      logger.error('Failed to search similar chunks:', error);
      throw error;
    }
  }
}
