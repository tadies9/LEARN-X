import { 
  IVectorStore, 
  VectorDocument, 
  VectorSearchOptions, 
  VectorSearchResult,
  IndexConfig,
  VectorStoreStats,
  BatchOperationResult,
  VectorStoreCapabilities
} from '../interfaces/IVectorStore';
import { VectorPerformanceMonitor } from '../monitoring/VectorPerformanceMonitor';
import { logger } from '../../../utils/logger';

export abstract class BaseVectorStore implements IVectorStore {
  protected config!: IndexConfig;
  protected monitor: VectorPerformanceMonitor;
  protected initialized: boolean = false;
  protected provider: string;

  constructor(provider: string) {
    this.provider = provider;
    this.monitor = new VectorPerformanceMonitor({
      provider,
      enableDetailedLogging: process.env.NODE_ENV === 'development',
    });
  }

  /**
   * Initialize the vector store
   */
  async initialize(config: IndexConfig): Promise<void> {
    if (this.initialized) {
      logger.warn(`[${this.provider}] Vector store already initialized`);
      return;
    }

    this.config = config;
    
    try {
      await this.doInitialize(config);
      this.initialized = true;
      
      // Start health monitoring
      this.monitor.startHealthMonitoring();
      
      logger.info(`[${this.provider}] Vector store initialized`, {
        dimensions: config.dimensions,
        metric: config.metric,
      });
    } catch (error) {
      logger.error(`[${this.provider}] Failed to initialize vector store`, error);
      throw error;
    }
  }

  /**
   * Provider-specific initialization
   */
  protected abstract doInitialize(config: IndexConfig): Promise<void>;

  /**
   * Insert or update a single vector
   */
  async upsert(document: VectorDocument): Promise<void> {
    this.ensureInitialized();
    
    return this.monitor.monitorUpsert(
      () => this.doUpsert(document),
      1,
      { documentId: document.id }
    );
  }

  protected abstract doUpsert(document: VectorDocument): Promise<void>;

  /**
   * Batch insert or update vectors
   */
  async upsertBatch(documents: VectorDocument[]): Promise<BatchOperationResult> {
    this.ensureInitialized();
    
    return this.monitor.monitorUpsert(
      () => this.doUpsertBatch(documents),
      documents.length,
      { batchSize: documents.length }
    );
  }

  protected abstract doUpsertBatch(documents: VectorDocument[]): Promise<BatchOperationResult>;

  /**
   * Search for similar vectors
   */
  async search(
    queryVector: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    this.ensureInitialized();
    
    const defaultOptions: VectorSearchOptions = {
      topK: 10,
      threshold: 0.0,
      includeMetadata: true,
      includeVector: false,
      ...options,
    };

    return this.monitor.monitorSearch(
      () => this.doSearch(queryVector, defaultOptions),
      { 
        topK: defaultOptions.topK,
        hasFilter: !!defaultOptions.filter,
      }
    );
  }

  protected abstract doSearch(
    queryVector: number[],
    options: VectorSearchOptions
  ): Promise<VectorSearchResult[]>;

  /**
   * Multi-vector search
   */
  async searchMulti(
    queryVectors: number[][],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[][]> {
    this.ensureInitialized();
    
    // Default implementation: search each vector individually
    const results = await Promise.all(
      queryVectors.map(vector => this.search(vector, options))
    );
    
    return results;
  }

  /**
   * Delete vectors by ID
   */
  async delete(ids: string[]): Promise<BatchOperationResult> {
    this.ensureInitialized();
    
    return this.monitor.monitorDelete(
      () => this.doDelete(ids),
      ids.length,
      { idCount: ids.length }
    );
  }

  protected abstract doDelete(ids: string[]): Promise<BatchOperationResult>;

  /**
   * Delete vectors by filter
   */
  async deleteByFilter(filter: Record<string, any>): Promise<number> {
    this.ensureInitialized();
    
    return this.monitor.monitorDelete(
      () => this.doDeleteByFilter(filter),
      -1, // Unknown count
      { filter }
    );
  }

  protected abstract doDeleteByFilter(filter: Record<string, any>): Promise<number>;

  /**
   * Get vectors by ID
   */
  async get(ids: string[]): Promise<VectorDocument[]> {
    this.ensureInitialized();
    return this.doGet(ids);
  }

  protected abstract doGet(ids: string[]): Promise<VectorDocument[]>;

  /**
   * Update metadata
   */
  async updateMetadata(
    id: string,
    metadata: Record<string, any>
  ): Promise<void> {
    this.ensureInitialized();
    return this.doUpdateMetadata(id, metadata);
  }

  protected abstract doUpdateMetadata(
    id: string,
    metadata: Record<string, any>
  ): Promise<void>;

  /**
   * Get store statistics
   */
  async getStats(): Promise<VectorStoreStats> {
    this.ensureInitialized();
    
    const stats = await this.doGetStats();
    return {
      ...stats,
      provider: this.provider,
      capabilities: this.getCapabilities(),
    };
  }

  protected abstract doGetStats(): Promise<Omit<VectorStoreStats, 'provider' | 'capabilities'>>;

  /**
   * Get store capabilities
   */
  protected abstract getCapabilities(): VectorStoreCapabilities;

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try a simple operation
      await this.getStats();
      return true;
    } catch (error) {
      logger.error(`[${this.provider}] Health check failed`, error);
      return false;
    }
  }

  /**
   * Clear all vectors
   */
  async clear(): Promise<void> {
    this.ensureInitialized();
    
    const confirmed = process.env.NODE_ENV === 'test' || 
                     process.env.ALLOW_VECTOR_CLEAR === 'true';
    
    if (!confirmed) {
      throw new Error('Clear operation not allowed in this environment');
    }
    
    return this.doClear();
  }

  protected abstract doClear(): Promise<void>;

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    try {
      await this.doClose();
      this.initialized = false;
      logger.info(`[${this.provider}] Vector store closed`);
    } catch (error) {
      logger.error(`[${this.provider}] Error closing vector store`, error);
      throw error;
    }
  }

  protected abstract doClose(): Promise<void>;

  /**
   * Ensure the store is initialized
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.provider} vector store not initialized`);
    }
  }

  /**
   * Validate vector dimensions
   */
  protected validateVector(vector: number[]): void {
    if (!vector || vector.length === 0) {
      throw new Error('Vector cannot be empty');
    }
    
    if (this.config && vector.length !== this.config.dimensions) {
      throw new Error(
        `Vector dimension mismatch. Expected ${this.config.dimensions}, got ${vector.length}`
      );
    }
  }

  /**
   * Normalize vector (for cosine similarity)
   */
  protected normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude === 0) {
      throw new Error('Cannot normalize zero vector');
    }
    
    return vector.map(val => val / magnitude);
  }

  /**
   * Calculate cosine similarity
   */
  protected cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}