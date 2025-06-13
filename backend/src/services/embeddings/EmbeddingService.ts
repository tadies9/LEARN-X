import { openAIService } from '../openai/OpenAIService';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { TokenCounter } from '../ai/TokenCounter';
import { CostTracker } from '../ai/CostTracker';
import { AIRequestType } from '../../types/ai';
import pLimit from 'p-limit';

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

export class EmbeddingService {
  private model: string = 'text-embedding-3-small';
  private dimensions: number = 1536;
  private batchSize: number = 50;
  private concurrencyLimit = pLimit(3); // Limit concurrent API calls
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
    for (let i = 0; i < chunks.length; i += this.batchSize) {
      const batch = chunks.slice(i, i + this.batchSize);

      await this.concurrencyLimit(async () => {
        try {
          const texts = batch.map((chunk) => chunk.content);
          const embeddings = await this.generateEmbeddings(texts, userId);

          await this.storeEmbeddings(batch, embeddings);

          logger.info(
            `Processed batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(chunks.length / this.batchSize)}`
          );
        } catch (error) {
          logger.error(`Failed to process batch starting at index ${i}:`, error);
          throw error;
        }
      });
    }

    logger.info('Completed embedding generation for all chunks');
  }

  private async storeEmbeddings(chunks: Chunk[], embeddings: number[][]): Promise<void> {
    try {
      const records = chunks.map((chunk, index) => ({
        file_id: chunk.fileId,
        chunk_id: chunk.id,
        embedding: embeddings[index],
        model: this.model,
      }));

      const { error } = await supabase.from('chunk_embeddings').insert(records);

      if (error) {
        throw error;
      }

      logger.info(`Stored ${records.length} embeddings in database`);
    } catch (error) {
      logger.error('Failed to store embeddings:', error);
      throw error;
    }
  }

  async getFileEmbeddings(fileId: string): Promise<Embedding[]> {
    try {
      const { data, error } = await supabase
        .from('chunk_embeddings')
        .select('chunk_id, embedding, model')
        .eq('file_id', fileId)
        .order('chunk_id');

      if (error) {
        throw error;
      }

      return data.map((row) => ({
        chunkId: row.chunk_id,
        embedding: row.embedding,
        model: row.model,
      }));
    } catch (error) {
      logger.error('Failed to get file embeddings:', error);
      throw error;
    }
  }

  async deleteFileEmbeddings(fileId: string): Promise<void> {
    try {
      const { error } = await supabase.from('chunk_embeddings').delete().eq('file_id', fileId);

      if (error) {
        throw error;
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
        .from('chunk_embeddings')
        .select('*', { count: 'exact', head: true })
        .eq('file_id', fileId);

      if (error) {
        throw error;
      }

      return (count || 0) > 0;
    } catch (error) {
      logger.error('Failed to check embeddings existence:', error);
      return false;
    }
  }
}
