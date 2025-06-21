import { IVectorStore } from '../../interfaces/IVectorStore';
import { logger } from '../../../../utils/logger';
import { VectorGenerator } from '../utils/VectorGenerator';
import { BenchmarkMetrics } from '../utils/BenchmarkMetrics';
import { BenchmarkResult } from '../types/benchmark.types';

export class BenchmarkOperations {
  /**
   * Benchmark indexing operations
   */
  static async benchmarkIndexing(
    store: IVectorStore,
    provider: string,
    vectorCount: number,
    testVectors: number[][],
    batchSize: number
  ): Promise<BenchmarkResult> {
    const documents = VectorGenerator.generateDocuments(vectorCount, testVectors);
    const batches = VectorGenerator.createBatches(documents, batchSize);
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

    return BenchmarkMetrics.recordResult({
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
  static async benchmarkSearch(
    store: IVectorStore,
    provider: string,
    vectorCount: number,
    queries: number[][],
    topK: number
  ): Promise<BenchmarkResult> {
    const latencies: number[] = [];
    let errors = 0;
    let totalResults = 0;

    const startTime = Date.now();

    for (const query of queries) {
      const queryStart = Date.now();

      try {
        const results = await store.search(query, {
          topK,
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

    return BenchmarkMetrics.recordResult({
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
  static async benchmarkUpdates(
    store: IVectorStore,
    provider: string,
    vectorCount: number
  ): Promise<BenchmarkResult> {
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

    return BenchmarkMetrics.recordResult({
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
  static async benchmarkDeletes(
    store: IVectorStore,
    provider: string,
    vectorCount: number
  ): Promise<BenchmarkResult> {
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

    return BenchmarkMetrics.recordResult({
      provider,
      vectorCount,
      operation: 'delete',
      latencies: [totalTime],
      totalTime,
      errorCount: errors,
      totalCount: deleteCount,
    });
  }
}