import { BenchmarkResult, BenchmarkData } from '../types/benchmark.types';
import { logger } from '../../../../utils/logger';

export class BenchmarkMetrics {
  /**
   * Get percentile from sorted array
   */
  static getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * Record benchmark result
   */
  static recordResult(data: BenchmarkData): BenchmarkResult {
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

    logger.info('[Benchmark] Result recorded:', {
      provider: result.provider,
      operation: result.operation,
      vectorCount: result.vectorCount,
      avgLatency: result.avgLatencyMs.toFixed(2),
      throughput: result.throughput.toFixed(2),
    });

    return result;
  }

  /**
   * Generate summary statistics
   */
  static generateSummary(results: BenchmarkResult[], providers: string[]): any {
    const summary: any = {};

    for (const provider of providers) {
      summary[provider] = {};

      for (const operation of ['index', 'search', 'update', 'delete']) {
        const operationResults = results.filter(
          (r) => r.provider === provider && r.operation === operation
        );

        if (operationResults.length > 0) {
          summary[provider][operation] = {
            avgLatency:
              operationResults.reduce((sum, r) => sum + r.avgLatencyMs, 0) /
              operationResults.length,
            avgThroughput:
              operationResults.reduce((sum, r) => sum + r.throughput, 0) /
              operationResults.length,
            avgErrorRate:
              operationResults.reduce((sum, r) => sum + r.errorRate, 0) /
              operationResults.length,
          };
        }
      }
    }

    return summary;
  }
}