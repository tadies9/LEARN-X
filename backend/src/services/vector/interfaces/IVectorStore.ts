/**
 * Vector Store Interface
 * Provides a unified interface for different vector database backends
 */

export interface VectorDocument {
  id: string;
  vector: number[];
  metadata?: Record<string, any>;
  content?: string;
}

export interface VectorSearchOptions {
  topK?: number;
  threshold?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  includeVector?: boolean;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  vector?: number[];
  metadata?: Record<string, any>;
  content?: string;
}

export interface IndexConfig {
  dimensions: number;
  metric: 'cosine' | 'euclidean' | 'dotproduct';
  indexType?: string;
  indexParams?: Record<string, any>;
}

export interface VectorStoreStats {
  totalVectors: number;
  dimensions: number;
  indexSize?: number;
  lastUpdated?: Date;
  provider: string;
  capabilities: VectorStoreCapabilities;
}

export interface VectorStoreCapabilities {
  supportsMetadataFiltering: boolean;
  supportsHybridSearch: boolean;
  supportsBatchOperations: boolean;
  supportsIncrementalIndexing: boolean;
  maxDimensions: number;
  maxVectorsPerBatch: number;
  maxMetadataSize: number;
}

export interface BatchOperationResult {
  successful: number;
  failed: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * Main Vector Store Interface
 */
export interface IVectorStore {
  /**
   * Initialize the vector store connection and indexes
   */
  initialize(config: IndexConfig): Promise<void>;

  /**
   * Insert a single vector document
   */
  upsert(document: VectorDocument): Promise<void>;

  /**
   * Insert multiple vector documents in batch
   */
  upsertBatch(documents: VectorDocument[]): Promise<BatchOperationResult>;

  /**
   * Search for similar vectors
   */
  search(
    queryVector: number[],
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult[]>;

  /**
   * Search using multiple query vectors (multi-vector search)
   */
  searchMulti(
    queryVectors: number[][],
    options?: VectorSearchOptions
  ): Promise<VectorSearchResult[][]>;

  /**
   * Delete vectors by ID
   */
  delete(ids: string[]): Promise<BatchOperationResult>;

  /**
   * Delete vectors matching a filter
   */
  deleteByFilter(filter: Record<string, any>): Promise<number>;

  /**
   * Get vectors by ID
   */
  get(ids: string[]): Promise<VectorDocument[]>;

  /**
   * Update metadata for existing vectors
   */
  updateMetadata(
    id: string,
    metadata: Record<string, any>
  ): Promise<void>;

  /**
   * Get statistics about the vector store
   */
  getStats(): Promise<VectorStoreStats>;

  /**
   * Check if the vector store is healthy and accessible
   */
  healthCheck(): Promise<boolean>;

  /**
   * Clear all vectors from the store
   */
  clear(): Promise<void>;

  /**
   * Close connections and clean up resources
   */
  close(): Promise<void>;
}

/**
 * Extended interface for vector stores with advanced features
 */
export interface IAdvancedVectorStore extends IVectorStore {
  /**
   * Perform hybrid search combining vector and keyword search
   */
  hybridSearch(
    queryVector: number[],
    queryText: string,
    options?: VectorSearchOptions & {
      vectorWeight?: number;
      textWeight?: number;
    }
  ): Promise<VectorSearchResult[]>;

  /**
   * Create or update an index
   */
  createIndex(name: string, config: IndexConfig): Promise<void>;

  /**
   * Delete an index
   */
  deleteIndex(name: string): Promise<void>;

  /**
   * List all indexes
   */
  listIndexes(): Promise<string[]>;

  /**
   * Optimize index for better performance
   */
  optimizeIndex(name?: string): Promise<void>;

  /**
   * Export vectors for backup or migration
   */
  export(filter?: Record<string, any>): AsyncIterable<VectorDocument>;

  /**
   * Import vectors from backup or migration
   */
  import(documents: AsyncIterable<VectorDocument>): Promise<BatchOperationResult>;
}

/**
 * Factory interface for creating vector store instances
 */
export interface IVectorStoreFactory {
  create(provider: string, config: any): IVectorStore;
  isSupported(provider: string): boolean;
  getProviders(): string[];
}