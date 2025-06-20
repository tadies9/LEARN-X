/**
 * Vector operations and search type definitions
 * Comprehensive interfaces for vector stores and search operations
 */

// Vector store configuration
export interface VectorStoreConfig {
  provider: 'pgvector' | 'pinecone' | 'weaviate' | 'qdrant';
  connectionString?: string;
  apiKey?: string;
  host?: string;
  port?: number;
  database?: string;
  index?: string;
  environment?: string;
  dimensions?: number;
  metric?: 'cosine' | 'euclidean' | 'dot_product';
  timeout?: number;
  retries?: number;
  batchSize?: number;
}

// Vector document interface
export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: VectorMetadata;
  namespace?: string;
}

export interface VectorMetadata {
  fileId: string;
  fileName?: string;
  chunkIndex: number;
  sectionTitle?: string;
  contentType: string;
  importance: string;
  hierarchyLevel: number;
  concepts: string[];
  timestamp: string;
  userId?: string;
  courseId?: string;
  moduleId?: string;
  [key: string]: unknown;
}

// Vector search operations
export interface VectorSearchQuery {
  embedding?: number[];
  text?: string;
  topK?: number;
  threshold?: number;
  filter?: VectorFilter;
  includeMetadata?: boolean;
  includeValues?: boolean;
  namespace?: string;
}

export interface VectorFilter {
  must?: FilterCondition[];
  should?: FilterCondition[];
  mustNot?: FilterCondition[];
  fileIds?: string[];
  contentTypes?: string[];
  importanceLevels?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  userId?: string;
  courseId?: string;
  [key: string]: unknown;
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: string | number | boolean | string[] | number[];
}

export interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  metadata: VectorMetadata;
  embedding?: number[];
  namespace?: string;
}

export interface VectorSearchResponse {
  results: VectorSearchResult[];
  total?: number;
  processingTime: number;
  searchId?: string;
  metadata?: Record<string, unknown>;
}

// Vector store operations
export interface VectorStoreOperations {
  upsert(documents: VectorDocument[]): Promise<VectorUpsertResponse>;
  search(query: VectorSearchQuery): Promise<VectorSearchResponse>;
  delete(ids: string[], namespace?: string): Promise<VectorDeleteResponse>;
  fetch(ids: string[], namespace?: string): Promise<VectorFetchResponse>;
  describe(): Promise<VectorIndexInfo>;
  stats(): Promise<VectorStoreStats>;
}

export interface VectorUpsertResponse {
  upsertedCount: number;
  ids?: string[];
  errors?: VectorOperationError[];
  processingTime: number;
}

export interface VectorDeleteResponse {
  deletedCount: number;
  ids?: string[];
  errors?: VectorOperationError[];
  processingTime: number;
}

export interface VectorFetchResponse {
  documents: Record<string, VectorDocument>;
  errors?: VectorOperationError[];
  processingTime: number;
}

export interface VectorOperationError {
  id?: string;
  message: string;
  code?: string;
  retryable?: boolean;
}

export interface VectorIndexInfo {
  name: string;
  dimensions: number;
  metric: string;
  status: 'active' | 'initializing' | 'terminating';
  podCount?: number;
  podType?: string;
  replicas?: number;
  shards?: number;
  totalVectorCount?: number;
  fullness?: number;
  metadata?: Record<string, unknown>;
}

export interface VectorStoreStats {
  totalVectors: number;
  dimensions: number;
  indexSizeBytes?: number;
  namespaces?: Record<string, NamespaceStats>;
  lastUpdated: string;
  performance?: PerformanceStats;
}

export interface NamespaceStats {
  vectorCount: number;
  avgVectorSize?: number;
  lastUpdated: string;
}

export interface PerformanceStats {
  avgSearchLatency: number;
  avgUpsertLatency: number;
  throughput: number;
  errorRate: number;
  cacheHitRate?: number;
}

// Hybrid search types
export interface HybridSearchQuery {
  text: string;
  embedding?: number[];
  keywordQuery?: KeywordQuery;
  vectorQuery?: VectorSearchQuery;
  weights?: SearchWeights;
  rerankOptions?: RerankOptions;
  userId?: string;
  fileId?: string;
}

export interface KeywordQuery {
  text: string;
  fields?: string[];
  boost?: Record<string, number>;
  fuzzy?: boolean;
  analyzer?: string;
  operator?: 'and' | 'or';
}

export interface SearchWeights {
  semantic: number;
  keyword: number;
  recency?: number;
  popularity?: number;
  personal?: number;
}

export interface RerankOptions {
  enabled: boolean;
  model?: string;
  topK?: number;
  diversityBoost?: number;
  personalityBoost?: number;
}

export interface HybridSearchResult extends VectorSearchResult {
  keywordScore?: number;
  semanticScore?: number;
  combinedScore: number;
  rankPosition: number;
  rerankScore?: number;
  searchType: 'semantic' | 'keyword' | 'hybrid';
}

// Vector optimization types
export interface VectorOptimizationConfig {
  enableAutoOptimization: boolean;
  optimizationSchedule?: string;
  performanceThresholds: {
    maxLatency: number;
    minThroughput: number;
    maxErrorRate: number;
  };
  indexingStrategy: 'immediate' | 'batched' | 'scheduled';
  batchSize?: number;
  compressionEnabled?: boolean;
  quantizationEnabled?: boolean;
  pruningEnabled?: boolean;
}

export interface VectorBenchmarkResult {
  testName: string;
  provider: string;
  config: VectorStoreConfig;
  metrics: BenchmarkMetrics;
  timestamp: string;
  duration: number;
}

export interface BenchmarkMetrics {
  searchLatency: LatencyMetrics;
  upsertLatency: LatencyMetrics;
  throughput: ThroughputMetrics;
  accuracy: AccuracyMetrics;
  resourceUsage: ResourceUsageMetrics;
}

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
}

export interface ThroughputMetrics {
  searchQps: number;
  upsertQps: number;
  maxConcurrentQueries: number;
}

export interface AccuracyMetrics {
  recall: number;
  precision: number;
  f1Score: number;
  relevanceScore: number;
}

export interface ResourceUsageMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage?: number;
  networkUsage?: number;
  costPerQuery?: number;
}