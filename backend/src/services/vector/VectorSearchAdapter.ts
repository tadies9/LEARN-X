import { IVectorStore, VectorSearchOptions, VectorSearchResult } from './interfaces/IVectorStore';
import { VectorStoreFactory, VectorStoreConfig } from './VectorStoreFactory';
import { VectorEmbeddingService } from '../embeddings/VectorEmbeddingService';
import { logger } from '../../utils/logger';

export interface AdaptedSearchOptions extends VectorSearchOptions {
  fileIdFilter?: string;
  weightVector?: number;
  weightKeyword?: number;
}

export interface AdaptedSearchResult extends VectorSearchResult {
  chunkId: string;
  fileId: string;
  similarity: number;
}

/**
 * Adapter to bridge the new vector store abstraction with existing code
 */
export class VectorSearchAdapter {
  private vectorStore: IVectorStore | null = null;
  private embeddingService: VectorEmbeddingService;
  private storeConfig: VectorStoreConfig;
  private initialized: boolean = false;

  constructor(
    embeddingService: VectorEmbeddingService,
    storeConfig: VectorStoreConfig = { provider: 'pgvector' }
  ) {
    this.embeddingService = embeddingService;
    this.storeConfig = storeConfig;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const factory = VectorStoreFactory.getInstance();
      this.vectorStore = await factory.getStore(this.storeConfig);
      
      await this.vectorStore.initialize({
        dimensions: 1536,
        metric: 'cosine',
      });

      this.initialized = true;
      logger.info('[VectorSearchAdapter] Initialized with provider:', this.storeConfig.provider);
    } catch (error) {
      logger.error('[VectorSearchAdapter] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Search for similar chunks using the vector store
   */
  async searchSimilarChunks(
    query: string,
    options: AdaptedSearchOptions = {}
  ): Promise<AdaptedSearchResult[]> {
    await this.ensureInitialized();

    // Generate embedding for the query
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // Prepare search options
    const searchOptions: VectorSearchOptions = {
      topK: options.topK || 10,
      threshold: options.threshold || 0.7,
      includeMetadata: true,
      includeVector: false,
      filter: options.filter,
    };

    // Add file ID filter if provided
    if (options.fileIdFilter) {
      searchOptions.filter = {
        ...searchOptions.filter,
        fileId: options.fileIdFilter,
      };
    }

    // Perform vector search
    const results = await this.vectorStore!.search(queryEmbedding, searchOptions);

    // Transform results to match expected format
    return results.map(result => ({
      ...result,
      chunkId: result.id,
      fileId: result.metadata?.fileId || '',
      similarity: result.score,
    }));
  }

  /**
   * Index chunks with embeddings
   */
  async indexChunks(
    chunks: Array<{
      id: string;
      fileId: string;
      content: string;
      embedding?: number[];
      metadata?: Record<string, any>;
    }>,
    userId?: string
  ): Promise<void> {
    await this.ensureInitialized();

    // Generate embeddings for chunks without them
    const chunksToEmbed = chunks.filter(chunk => !chunk.embedding);
    let embeddings: number[][] = [];

    if (chunksToEmbed.length > 0) {
      embeddings = await this.embeddingService.generateEmbeddings(
        chunksToEmbed.map(c => c.content),
        userId
      );
    }

    // Prepare documents for the vector store
    const documents = chunks.map((chunk, _index) => {
      const embedding = chunk.embedding || embeddings[chunks.indexOf(chunk)];
      
      return {
        id: chunk.id,
        vector: embedding,
        content: chunk.content,
        metadata: {
          ...chunk.metadata,
          fileId: chunk.fileId,
        },
      };
    });

    // Index in batches
    const result = await this.vectorStore!.upsertBatch(documents);

    if (result.failed > 0) {
      logger.error('[VectorSearchAdapter] Failed to index some chunks:', result.errors);
    }

    logger.info('[VectorSearchAdapter] Indexed chunks', {
      total: documents.length,
      successful: result.successful,
      failed: result.failed,
    });
  }

  /**
   * Delete embeddings for a file
   */
  async deleteFileEmbeddings(fileId: string): Promise<void> {
    await this.ensureInitialized();

    const deletedCount = await this.vectorStore!.deleteByFilter({ fileId });
    
    logger.info('[VectorSearchAdapter] Deleted embeddings', {
      fileId,
      count: deletedCount,
    });
  }

  /**
   * Check if embeddings exist for a file
   */
  async checkEmbeddingsExist(fileId: string): Promise<boolean> {
    await this.ensureInitialized();

    const results = await this.vectorStore!.search(
      new Array(1536).fill(0), // Dummy vector
      {
        topK: 1,
        filter: { fileId },
        includeMetadata: false,
        includeVector: false,
      }
    );

    return results.length > 0;
  }

  /**
   * Get vector store statistics
   */
  async getStats(): Promise<any> {
    await this.ensureInitialized();
    return this.vectorStore!.getStats();
  }

  /**
   * Switch to a different vector store provider
   */
  async switchProvider(newConfig: VectorStoreConfig): Promise<void> {
    logger.info('[VectorSearchAdapter] Switching provider', {
      from: this.storeConfig.provider,
      to: newConfig.provider,
    });

    // Close current store
    if (this.vectorStore) {
      await this.vectorStore.close();
    }

    // Update config and reinitialize
    this.storeConfig = newConfig;
    this.initialized = false;
    await this.initialize();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

/**
 * Create a singleton instance for the application
 */
let adapterInstance: VectorSearchAdapter | null = null;

export function getVectorSearchAdapter(
  embeddingService?: VectorEmbeddingService,
  config?: VectorStoreConfig
): VectorSearchAdapter {
  if (!adapterInstance) {
    if (!embeddingService) {
      throw new Error('EmbeddingService required for first initialization');
    }
    adapterInstance = new VectorSearchAdapter(embeddingService, config);
  }
  
  return adapterInstance;
}