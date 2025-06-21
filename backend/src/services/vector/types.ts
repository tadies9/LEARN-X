/**
 * Vector Store Types
 * Type definitions for vector store configurations
 */

export interface VectorStoreConfig {
  provider: 'pinecone' | 'weaviate' | 'qdrant' | 'milvus' | 'chroma';
  apiKey?: string;
  environment?: string;
  indexName?: string;
  url?: string;
  port?: number;
  collectionName?: string;
  dimensions?: number;
  metric?: 'cosine' | 'euclidean' | 'dotproduct';
  cloudRegion?: string;
  cloudProvider?: string;
  timeout?: number;
  maxRetries?: number;
  batchSize?: number;
}