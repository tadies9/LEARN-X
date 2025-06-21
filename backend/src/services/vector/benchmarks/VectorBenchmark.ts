import { IVectorStore } from '../interfaces/IVectorStore';
import { VectorStoreFactory, VectorStoreProvider } from '../VectorStoreFactory';
import { logger } from '../../../utils/logger';
import { BenchmarkConfig, BenchmarkResult } from './types/benchmark.types';
import { VectorGenerator } from './utils/VectorGenerator';
import { BenchmarkOperations } from './operations/BenchmarkOperations';
import { BenchmarkReporter } from './reporters/BenchmarkReporter';
import * as path from 'path';

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
        await this.benchmarkProvider(provider as VectorStoreProvider);
      } catch (error) {
        logger.error(`[Benchmark] Failed to benchmark ${provider}:`, error);
      }
    }

    // Generate reports
    await BenchmarkReporter.generateReports(this.config, this.results, this.config.outputDir);
    logger.info('[Benchmark] Reports generated in:', this.config.outputDir);
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

        // Run benchmark operations
        const indexResult = await BenchmarkOperations.benchmarkIndexing(
          store,
          provider,
          vectorCount,
          this.testVectors,
          this.config.batchSize
        );
        this.results.push(indexResult);

        const searchResult = await BenchmarkOperations.benchmarkSearch(
          store,
          provider,
          vectorCount,
          this.testVectors.slice(0, this.config.queryCount),
          this.config.topK
        );
        this.results.push(searchResult);

        const updateResult = await BenchmarkOperations.benchmarkUpdates(
          store,
          provider,
          vectorCount
        );
        this.results.push(updateResult);

        const deleteResult = await BenchmarkOperations.benchmarkDeletes(
          store,
          provider,
          vectorCount
        );
        this.results.push(deleteResult);
      }
    } finally {
      await store.close();
    }
  }

  /**
   * Generate test data
   */
  private async generateTestData(): Promise<void> {
    logger.info('[Benchmark] Generating test vectors');

    const maxVectors = Math.max(...this.config.vectorCounts);
    this.testVectors = VectorGenerator.generateRandomVectors(
      maxVectors + this.config.queryCount,
      this.config.dimensions
    );
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