import { IVectorStore } from '../interfaces/IVectorStore';
import { VectorStoreFactory, VectorStoreProvider } from '../VectorStoreFactory';
import { logger } from '../../../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface BenchmarkConfig {
  providers: VectorStoreProvider[];
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

export class VectorBenchmark {
  private config: BenchmarkConfig;
  private results: BenchmarkResult[] = [];
  private testVectors: number[][] = [];

  constructor(config: BenchmarkConfig) {
    this.config = config;
  }

  /**
   * Run comprehensive benchmarks
   */
  async runBenchmarks(): Promise<void> {
    logger.info('[Benchmark] Starting vector store benchmarks', this.config);

    // Generate test data
    await this.generateTestData();

    // Run benchmarks for each provider
    for (const provider of this.config.providers) {
      logger.info(`[Benchmark] Testing provider: ${provider}`);
      
      try {
        await this.benchmarkProvider(provider);
      } catch (error) {
        logger.error(`[Benchmark] Failed to benchmark ${provider}:`, error);
      }
    }

    // Generate reports
    await this.generateReports();
  }

  /**
   * Benchmark a single provider
   */
  private async benchmarkProvider(provider: VectorStoreProvider): Promise<void> {
    const factory = VectorStoreFactory.getInstance();
    const store = factory.create(provider);

    try {
      // Initialize store
      await store.initialize({
        dimensions: this.config.dimensions,
        metric: 'cosine',
      });

      // Test different vector counts
      for (const vectorCount of this.config.vectorCounts) {
        logger.info(`[Benchmark] Testing ${provider} with ${vectorCount} vectors`);

        // Clear store
        if (process.env.ALLOW_VECTOR_CLEAR === 'true') {
          await store.clear();
        }

        // Benchmark indexing
        await this.benchmarkIndexing(store, provider, vectorCount);

        // Benchmark search
        await this.benchmarkSearch(store, provider, vectorCount);

        // Benchmark updates
        await this.benchmarkUpdates(store, provider, vectorCount);

        // Benchmark deletes
        await this.benchmarkDeletes(store, provider, vectorCount);
      }
    } finally {
      await store.close();
    }
  }

  /**
   * Benchmark indexing operations
   */
  private async benchmarkIndexing(
    store: IVectorStore,
    provider: string,
    vectorCount: number
  ): Promise<void> {
    const documents = this.generateDocuments(vectorCount);
    const batches = this.createBatches(documents, this.config.batchSize);
    const latencies: number[] = [];
    let errors = 0;

    const startTime = Date.now();

    for (const batch of batches) {
      const batchStart = Date.now();
      
      try {
        const result = await store.upsertBatch(batch);
        errors += result.failed;
      } catch (error) {
        errors += batch.length;
        logger.error('[Benchmark] Indexing error:', error);
      }

      latencies.push(Date.now() - batchStart);
    }

    const totalTime = Date.now() - startTime;

    this.recordResult({
      provider,
      vectorCount,
      operation: 'index',
      latencies,
      totalTime,
      errorCount: errors,
      totalCount: documents.length,
    });
  }

  /**
   * Benchmark search operations
   */
  private async benchmarkSearch(
    store: IVectorStore,
    provider: string,
    vectorCount: number
  ): Promise<void> {
    const queries = this.testVectors.slice(0, this.config.queryCount);
    const latencies: number[] = [];
    let errors = 0;
    let totalResults = 0;

    const startTime = Date.now();

    for (const query of queries) {
      const queryStart = Date.now();
      
      try {
        const results = await store.search(query, {
          topK: this.config.topK,
          includeMetadata: true,
        });
        totalResults += results.length;
      } catch (error) {
        errors++;
        logger.error('[Benchmark] Search error:', error);
      }

      latencies.push(Date.now() - queryStart);
    }

    const totalTime = Date.now() - startTime;

    this.recordResult({
      provider,
      vectorCount,
      operation: 'search',
      latencies,
      totalTime,
      errorCount: errors,
      totalCount: queries.length,
      metadata: {
        avgResultsPerQuery: totalResults / queries.length,
      },
    });
  }

  /**
   * Benchmark update operations
   */
  private async benchmarkUpdates(
    store: IVectorStore,
    provider: string,
    vectorCount: number
  ): Promise<void> {
    const updateCount = Math.min(100, vectorCount / 10);
    const latencies: number[] = [];
    let errors = 0;

    const startTime = Date.now();

    for (let i = 0; i < updateCount; i++) {
      const updateStart = Date.now();
      const docId = `doc_${i}`;
      
      try {
        await store.updateMetadata(docId, {
          updated: true,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        errors++;
        logger.error('[Benchmark] Update error:', error);
      }

      latencies.push(Date.now() - updateStart);
    }

    const totalTime = Date.now() - startTime;

    this.recordResult({
      provider,
      vectorCount,
      operation: 'update',
      latencies,
      totalTime,
      errorCount: errors,
      totalCount: updateCount,
    });
  }

  /**
   * Benchmark delete operations
   */
  private async benchmarkDeletes(
    store: IVectorStore,
    provider: string,
    vectorCount: number
  ): Promise<void> {
    const deleteCount = Math.min(100, vectorCount / 10);
    const deleteIds = Array.from({ length: deleteCount }, (_, i) => `doc_${i}`);
    
    const startTime = Date.now();
    let errors = 0;

    try {
      const result = await store.delete(deleteIds);
      errors = result.failed;
    } catch (error) {
      errors = deleteCount;
      logger.error('[Benchmark] Delete error:', error);
    }

    const totalTime = Date.now() - startTime;

    this.recordResult({
      provider,
      vectorCount,
      operation: 'delete',
      latencies: [totalTime],
      totalTime,
      errorCount: errors,
      totalCount: deleteCount,
    });
  }

  /**
   * Generate test data
   */
  private async generateTestData(): Promise<void> {
    logger.info('[Benchmark] Generating test vectors');

    const maxVectors = Math.max(...this.config.vectorCounts);
    this.testVectors = this.generateRandomVectors(
      maxVectors + this.config.queryCount,
      this.config.dimensions
    );
  }

  /**
   * Generate random vectors
   */
  private generateRandomVectors(count: number, dimensions: number): number[][] {
    const vectors: number[][] = [];
    
    for (let i = 0; i < count; i++) {
      const vector = Array.from({ length: dimensions }, () => 
        Math.random() * 2 - 1 // Random values between -1 and 1
      );
      
      // Normalize vector
      const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      const normalized = vector.map(val => val / magnitude);
      
      vectors.push(normalized);
    }

    return vectors;
  }

  /**
   * Generate test documents
   */
  private generateDocuments(count: number): any[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `doc_${i}`,
      vector: this.testVectors[i],
      metadata: {
        index: i,
        category: `category_${i % 10}`,
        timestamp: new Date().toISOString(),
      },
      content: `Test document ${i} with sample content for benchmarking`,
    }));
  }

  /**
   * Create batches from documents
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Record benchmark result
   */
  private recordResult(data: {
    provider: string;
    vectorCount: number;
    operation: string;
    latencies: number[];
    totalTime: number;
    errorCount: number;
    totalCount: number;
    metadata?: any;
  }): void {
    const sortedLatencies = [...data.latencies].sort((a, b) => a - b);
    
    const result: BenchmarkResult = {
      provider: data.provider,
      vectorCount: data.vectorCount,
      operation: data.operation,
      avgLatencyMs: data.latencies.reduce((sum, l) => sum + l, 0) / data.latencies.length,
      minLatencyMs: sortedLatencies[0] || 0,
      maxLatencyMs: sortedLatencies[sortedLatencies.length - 1] || 0,
      p50LatencyMs: this.getPercentile(sortedLatencies, 0.5),
      p95LatencyMs: this.getPercentile(sortedLatencies, 0.95),
      p99LatencyMs: this.getPercentile(sortedLatencies, 0.99),
      throughput: (data.totalCount / data.totalTime) * 1000,
      errorRate: (data.errorCount / data.totalCount) * 100,
      timestamp: new Date(),
      ...data.metadata,
    };

    this.results.push(result);
    
    logger.info('[Benchmark] Result recorded:', {
      provider: result.provider,
      operation: result.operation,
      vectorCount: result.vectorCount,
      avgLatency: result.avgLatencyMs.toFixed(2),
      throughput: result.throughput.toFixed(2),
    });
  }

  /**
   * Get percentile from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * Generate benchmark reports
   */
  private async generateReports(): Promise<void> {
    logger.info('[Benchmark] Generating reports');

    // Ensure output directory exists
    await fs.mkdir(this.config.outputDir, { recursive: true });

    // Generate CSV report
    await this.generateCSVReport();

    // Generate JSON report
    await this.generateJSONReport();

    // Generate comparison report
    await this.generateComparisonReport();

    // Generate recommendations
    await this.generateRecommendations();

    logger.info('[Benchmark] Reports generated in:', this.config.outputDir);
  }

  /**
   * Generate CSV report
   */
  private async generateCSVReport(): Promise<void> {
    const headers = [
      'Provider',
      'Vector Count',
      'Operation',
      'Avg Latency (ms)',
      'Min Latency (ms)',
      'Max Latency (ms)',
      'P50 Latency (ms)',
      'P95 Latency (ms)',
      'P99 Latency (ms)',
      'Throughput (ops/s)',
      'Error Rate (%)',
      'Timestamp',
    ];

    const rows = this.results.map(r => [
      r.provider,
      r.vectorCount,
      r.operation,
      r.avgLatencyMs.toFixed(2),
      r.minLatencyMs.toFixed(2),
      r.maxLatencyMs.toFixed(2),
      r.p50LatencyMs.toFixed(2),
      r.p95LatencyMs.toFixed(2),
      r.p99LatencyMs.toFixed(2),
      r.throughput.toFixed(2),
      r.errorRate.toFixed(2),
      r.timestamp.toISOString(),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    await fs.writeFile(
      path.join(this.config.outputDir, 'benchmark_results.csv'),
      csv
    );
  }

  /**
   * Generate JSON report
   */
  private async generateJSONReport(): Promise<void> {
    const report = {
      config: this.config,
      results: this.results,
      summary: this.generateSummary(),
      timestamp: new Date().toISOString(),
    };

    await fs.writeFile(
      path.join(this.config.outputDir, 'benchmark_results.json'),
      JSON.stringify(report, null, 2)
    );
  }

  /**
   * Generate comparison report
   */
  private async generateComparisonReport(): Promise<void> {
    const comparisons = this.compareProviders();
    
    await fs.writeFile(
      path.join(this.config.outputDir, 'provider_comparison.json'),
      JSON.stringify(comparisons, null, 2)
    );
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(): Promise<void> {
    const recommendations = this.generateProviderRecommendations();
    
    await fs.writeFile(
      path.join(this.config.outputDir, 'recommendations.md'),
      recommendations
    );
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(): any {
    const summary: any = {};

    for (const provider of this.config.providers) {
      summary[provider] = {};
      
      for (const operation of ['index', 'search', 'update', 'delete']) {
        const results = this.results.filter(
          r => r.provider === provider && r.operation === operation
        );

        if (results.length > 0) {
          summary[provider][operation] = {
            avgLatency: results.reduce((sum, r) => sum + r.avgLatencyMs, 0) / results.length,
            avgThroughput: results.reduce((sum, r) => sum + r.throughput, 0) / results.length,
            avgErrorRate: results.reduce((sum, r) => sum + r.errorRate, 0) / results.length,
          };
        }
      }
    }

    return summary;
  }

  /**
   * Compare providers
   */
  private compareProviders(): ProviderComparison[] {
    return this.config.providers.map(provider => {
      const results = this.results.filter(r => r.provider === provider);
      
      // Calculate scores (lower is better for latency, higher for throughput)
      const searchResults = results.filter(r => r.operation === 'search');
      const indexResults = results.filter(r => r.operation === 'index');
      
      const avgSearchLatency = searchResults.reduce((sum, r) => sum + r.avgLatencyMs, 0) / searchResults.length || 0;
      const avgIndexLatency = indexResults.reduce((sum, r) => sum + r.avgLatencyMs, 0) / indexResults.length || 0;
      
      const searchScore = avgSearchLatency > 0 ? 1000 / avgSearchLatency : 0;
      const indexScore = avgIndexLatency > 0 ? 1000 / avgIndexLatency : 0;
      
      return {
        provider,
        totalScore: searchScore + indexScore,
        searchScore,
        indexScore,
        costEstimate: this.estimateCost(provider),
        recommendation: this.getProviderRecommendation(provider, results),
      };
    });
  }

  /**
   * Estimate cost for provider
   */
  private estimateCost(provider: string): number {
    // Rough monthly cost estimates for 1M vectors
    const costMap: Record<string, number> = {
      pgvector: 50, // Self-hosted database costs
      pinecone: 70, // Based on their pricing tiers
      weaviate: 100, // Cloud hosted pricing
      qdrant: 75, // Cloud hosted pricing
    };

    return costMap[provider] || 0;
  }

  /**
   * Get provider recommendation
   */
  private getProviderRecommendation(provider: string, results: BenchmarkResult[]): string {
    const avgLatency = results.reduce((sum, r) => sum + r.avgLatencyMs, 0) / results.length;
    const maxVectorCount = Math.max(...results.map(r => r.vectorCount));

    if (provider === 'pgvector') {
      if (maxVectorCount > 1000000) {
        return 'Consider dedicated vector DB for scale > 1M vectors';
      }
      if (avgLatency > 500) {
        return 'Optimize indexes and consider hardware upgrades';
      }
      return 'Good for small to medium datasets with existing PostgreSQL';
    }

    if (provider === 'pinecone') {
      return 'Excellent for production workloads with managed infrastructure';
    }

    if (provider === 'weaviate') {
      return 'Great for hybrid search and complex filtering requirements';
    }

    if (provider === 'qdrant') {
      return 'Good balance of performance and features for medium scale';
    }

    return 'No specific recommendation';
  }

  /**
   * Generate provider recommendations markdown
   */
  private generateProviderRecommendations(): string {
    const comparisons = this.compareProviders();
    const sorted = [...comparisons].sort((a, b) => b.totalScore - a.totalScore);

    let markdown = '# Vector Store Provider Recommendations\n\n';
    markdown += `Generated: ${new Date().toISOString()}\n\n`;

    markdown += '## Executive Summary\n\n';
    markdown += `Based on benchmarks with vectors ranging from ${Math.min(...this.config.vectorCounts)} to ${Math.max(...this.config.vectorCounts)}:\n\n`;

    markdown += '### Performance Rankings\n\n';
    sorted.forEach((comp, index) => {
      markdown += `${index + 1}. **${comp.provider}** - Total Score: ${comp.totalScore.toFixed(2)}\n`;
      markdown += `   - Search Performance Score: ${comp.searchScore.toFixed(2)}\n`;
      markdown += `   - Index Performance Score: ${comp.indexScore.toFixed(2)}\n`;
      markdown += `   - Estimated Monthly Cost (1M vectors): $${comp.costEstimate}\n`;
      markdown += `   - Recommendation: ${comp.recommendation}\n\n`;
    });

    markdown += '## Detailed Analysis\n\n';

    for (const provider of this.config.providers) {
      markdown += `### ${provider}\n\n`;
      
      const results = this.results.filter(r => r.provider === provider);
      const summary = this.generateSummary()[provider];

      markdown += '#### Performance Metrics\n\n';
      markdown += '| Operation | Avg Latency (ms) | Throughput (ops/s) | Error Rate (%) |\n';
      markdown += '|-----------|------------------|-------------------|----------------|\n';
      
      for (const [op, stats] of Object.entries(summary)) {
        const s = stats as any;
        markdown += `| ${op} | ${s.avgLatency.toFixed(2)} | ${s.avgThroughput.toFixed(2)} | ${s.avgErrorRate.toFixed(2)} |\n`;
      }

      markdown += '\n#### Scalability\n\n';
      
      const scalabilityData = this.config.vectorCounts.map(count => {
        const searchResult = results.find(r => r.operation === 'search' && r.vectorCount === count);
        return {
          count,
          latency: searchResult?.avgLatencyMs || 0,
        };
      });

      markdown += '| Vector Count | Search Latency (ms) |\n';
      markdown += '|--------------|--------------------|\n';
      scalabilityData.forEach(data => {
        markdown += `| ${data.count.toLocaleString()} | ${data.latency.toFixed(2)} |\n`;
      });
      
      markdown += '\n';
    }

    markdown += '## Migration Recommendations\n\n';
    
    const currentVectorCount = Math.max(...this.config.vectorCounts);
    if (currentVectorCount < 100000) {
      markdown += '- **Current Scale**: Small dataset\n';
      markdown += '- **Recommendation**: pgvector is sufficient for your current needs\n';
      markdown += '- **Migration Trigger**: Consider migration when approaching 500K vectors\n';
    } else if (currentVectorCount < 1000000) {
      markdown += '- **Current Scale**: Medium dataset\n';
      markdown += '- **Recommendation**: Start planning migration to dedicated vector DB\n';
      markdown += '- **Best Options**: Pinecone or Qdrant for ease of migration\n';
    } else {
      markdown += '- **Current Scale**: Large dataset\n';
      markdown += '- **Recommendation**: Immediate migration to dedicated vector DB recommended\n';
      markdown += '- **Best Options**: Pinecone for managed solution, Weaviate for hybrid search\n';
    }

    return markdown;
  }
}

/**
 * Run benchmarks with default configuration
 */
export async function runDefaultBenchmarks(): Promise<void> {
  const benchmark = new VectorBenchmark({
    providers: ['pgvector'], // Add more providers as they become available
    dimensions: 1536,
    vectorCounts: [1000, 10000, 100000],
    queryCount: 100,
    topK: 10,
    batchSize: 100,
    outputDir: path.join(process.cwd(), 'benchmarks', new Date().toISOString()),
  });

  await benchmark.runBenchmarks();
}