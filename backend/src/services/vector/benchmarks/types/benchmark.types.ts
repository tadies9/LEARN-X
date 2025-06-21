export interface BenchmarkConfig {
  providers: string[];
  dimensions: number;
  vectorCounts: number[];
  queryCount: number;
  topK: number;
  batchSize: number;
  outputDir: string;
}

export interface BenchmarkResult {
  provider: string;
  vectorCount: number;
  operation: string;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  throughput: number;
  errorRate: number;
  timestamp: Date;
}

export interface ProviderComparison {
  provider: string;
  totalScore: number;
  searchScore: number;
  indexScore: number;
  costEstimate: number;
  recommendation: string;
}

export interface BenchmarkData {
  provider: string;
  vectorCount: number;
  operation: string;
  latencies: number[];
  totalTime: number;
  errorCount: number;
  totalCount: number;
  metadata?: any;
}