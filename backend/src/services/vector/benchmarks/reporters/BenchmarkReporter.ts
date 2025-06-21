import * as fs from 'fs/promises';
import * as path from 'path';
import { BenchmarkResult, ProviderComparison, BenchmarkConfig } from '../types/benchmark.types';
import { BenchmarkMetrics } from '../utils/BenchmarkMetrics';
import { ProviderAnalyzer } from './ProviderAnalyzer';

export class BenchmarkReporter {
  /**
   * Generate all benchmark reports
   */
  static async generateReports(
    config: BenchmarkConfig,
    results: BenchmarkResult[],
    outputDir: string
  ): Promise<void> {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    // Generate different report formats
    await this.generateCSVReport(results, outputDir);
    await this.generateJSONReport(config, results, outputDir);
    await this.generateComparisonReport(config, results, outputDir);
    await this.generateRecommendations(config, results, outputDir);
  }

  /**
   * Generate CSV report
   */
  private static async generateCSVReport(
    results: BenchmarkResult[],
    outputDir: string
  ): Promise<void> {
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

    const rows = results.map((r) => [
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

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    await fs.writeFile(path.join(outputDir, 'benchmark_results.csv'), csv);
  }

  /**
   * Generate JSON report
   */
  private static async generateJSONReport(
    config: BenchmarkConfig,
    results: BenchmarkResult[],
    outputDir: string
  ): Promise<void> {
    const report = {
      config,
      results,
      summary: BenchmarkMetrics.generateSummary(results, config.providers),
      timestamp: new Date().toISOString(),
    };

    await fs.writeFile(
      path.join(outputDir, 'benchmark_results.json'),
      JSON.stringify(report, null, 2)
    );
  }

  /**
   * Generate comparison report
   */
  private static async generateComparisonReport(
    config: BenchmarkConfig,
    results: BenchmarkResult[],
    outputDir: string
  ): Promise<void> {
    const comparisons = ProviderAnalyzer.compareProviders(config.providers, results);

    await fs.writeFile(
      path.join(outputDir, 'provider_comparison.json'),
      JSON.stringify(comparisons, null, 2)
    );
  }

  /**
   * Generate recommendations
   */
  private static async generateRecommendations(
    config: BenchmarkConfig,
    results: BenchmarkResult[],
    outputDir: string
  ): Promise<void> {
    const recommendations = ProviderAnalyzer.generateProviderRecommendations(
      config,
      results
    );

    await fs.writeFile(path.join(outputDir, 'recommendations.md'), recommendations);
  }
}