import { performance } from 'perf_hooks';
import { testConfig } from '../config/test.config';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  memory_usage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  custom_metrics?: Record<string, number>;
}

export interface BenchmarkResult {
  operation: string;
  samples: number;
  avg_duration: number;
  min_duration: number;
  max_duration: number;
  percentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
  success_rate: number;
  threshold_met: boolean;
}

export class PerformanceHelpers {
  private static measurements: Map<string, PerformanceMetrics[]> = new Map();
  private static activeTimers: Map<string, { start: number; name: string }> = new Map();

  static startTimer(operationName: string): string {
    const id = `${operationName}_${Date.now()}_${Math.random()}`;
    this.activeTimers.set(id, {
      start: performance.now(),
      name: operationName,
    });
    return id;
  }

  static endTimer(
    timerId: string,
    success: boolean = true,
    customMetrics?: Record<string, number>
  ): PerformanceMetrics {
    const timer = this.activeTimers.get(timerId);
    if (!timer) {
      throw new Error(`Timer with id ${timerId} not found`);
    }

    const duration = performance.now() - timer.start;
    const memoryUsage = process.memoryUsage();

    const metric: PerformanceMetrics = {
      operation: timer.name,
      duration,
      timestamp: Date.now(),
      success,
      memory_usage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
      },
      custom_metrics: customMetrics,
    };

    // Store the measurement
    if (!this.measurements.has(timer.name)) {
      this.measurements.set(timer.name, []);
    }
    this.measurements.get(timer.name)!.push(metric);

    // Clean up
    this.activeTimers.delete(timerId);

    return metric;
  }

  static async measureAsync<T>(
    operationName: string,
    operation: () => Promise<T>,
    customMetrics?: Record<string, number>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const timerId = this.startTimer(operationName);
    let success = false;
    let result: T;

    try {
      result = await operation();
      success = true;
      return { result, metrics: this.endTimer(timerId, success, customMetrics) };
    } catch (error) {
      this.endTimer(timerId, success, customMetrics);
      throw error;
    }
  }

  static measureSync<T>(
    operationName: string,
    operation: () => T,
    customMetrics?: Record<string, number>
  ): { result: T; metrics: PerformanceMetrics } {
    const timerId = this.startTimer(operationName);
    let success = false;
    let result: T;

    try {
      result = operation();
      success = true;
      return { result, metrics: this.endTimer(timerId, success, customMetrics) };
    } catch (error) {
      this.endTimer(timerId, success, customMetrics);
      throw error;
    }
  }

  static generateBenchmarkReport(operationName: string): BenchmarkResult | null {
    const metrics = this.measurements.get(operationName);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
    const successCount = metrics.filter((m) => m.success).length;

    // Calculate percentiles
    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    const result: BenchmarkResult = {
      operation: operationName,
      samples: metrics.length,
      avg_duration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      min_duration: durations[0],
      max_duration: durations[durations.length - 1],
      percentiles: {
        p50: durations[p50Index],
        p95: durations[p95Index],
        p99: durations[p99Index],
      },
      success_rate: successCount / metrics.length,
      threshold_met: this.checkThreshold(operationName, durations[p95Index]),
    };

    return result;
  }

  private static checkThreshold(operationName: string, p95Duration: number): boolean {
    const thresholds = {
      file_processing: testConfig.performance.fileProcessingThreshold,
      ai_generation: testConfig.performance.aiGenerationThreshold,
      search: testConfig.performance.searchThreshold,
      api_response: testConfig.performance.apiResponseThreshold,
    };

    // Try to match operation name with threshold keys
    for (const [key, threshold] of Object.entries(thresholds)) {
      if (operationName.toLowerCase().includes(key.toLowerCase())) {
        return p95Duration <= threshold;
      }
    }

    // Default threshold of 1 second if no specific threshold found
    return p95Duration <= 1000;
  }

  static getAllBenchmarkReports(): BenchmarkResult[] {
    const reports: BenchmarkResult[] = [];

    for (const operationName of this.measurements.keys()) {
      const report = this.generateBenchmarkReport(operationName);
      if (report) {
        reports.push(report);
      }
    }

    return reports;
  }

  static clearMeasurements(operationName?: string): void {
    if (operationName) {
      this.measurements.delete(operationName);
    } else {
      this.measurements.clear();
    }
  }

  static detectMemoryLeaks(operationName: string, maxGrowthMB: number = 50): boolean {
    const metrics = this.measurements.get(operationName);
    if (!metrics || metrics.length < 2) {
      return false;
    }

    const firstMeasurement = metrics[0];
    const lastMeasurement = metrics[metrics.length - 1];

    if (!firstMeasurement.memory_usage || !lastMeasurement.memory_usage) {
      return false;
    }

    const memoryGrowthBytes =
      lastMeasurement.memory_usage.heapUsed - firstMeasurement.memory_usage.heapUsed;
    const memoryGrowthMB = memoryGrowthBytes / (1024 * 1024);

    return memoryGrowthMB > maxGrowthMB;
  }

  static generatePerformanceReport(): {
    summary: {
      total_operations: number;
      total_measurements: number;
      overall_success_rate: number;
      memory_leak_detected: boolean;
    };
    benchmarks: BenchmarkResult[];
    threshold_violations: Array<{
      operation: string;
      actual_p95: number;
      threshold: number;
      violation_percentage: number;
    }>;
  } {
    const benchmarks = this.getAllBenchmarkReports();
    let totalMeasurements = 0;
    let successfulMeasurements = 0;
    let memoryLeakDetected = false;

    // Calculate totals and check for memory leaks
    for (const [operationName, metrics] of this.measurements) {
      totalMeasurements += metrics.length;
      successfulMeasurements += metrics.filter((m) => m.success).length;

      if (this.detectMemoryLeaks(operationName)) {
        memoryLeakDetected = true;
      }
    }

    // Find threshold violations
    const thresholdViolations = benchmarks
      .filter((b) => !b.threshold_met)
      .map((b) => {
        const expectedThreshold = this.getThresholdForOperation(b.operation);
        return {
          operation: b.operation,
          actual_p95: b.percentiles.p95,
          threshold: expectedThreshold,
          violation_percentage: ((b.percentiles.p95 - expectedThreshold) / expectedThreshold) * 100,
        };
      });

    return {
      summary: {
        total_operations: this.measurements.size,
        total_measurements: totalMeasurements,
        overall_success_rate:
          totalMeasurements > 0 ? successfulMeasurements / totalMeasurements : 0,
        memory_leak_detected: memoryLeakDetected,
      },
      benchmarks,
      threshold_violations: thresholdViolations,
    };
  }

  private static getThresholdForOperation(operationName: string): number {
    const thresholds = {
      file_processing: testConfig.performance.fileProcessingThreshold,
      ai_generation: testConfig.performance.aiGenerationThreshold,
      search: testConfig.performance.searchThreshold,
      api_response: testConfig.performance.apiResponseThreshold,
    };

    for (const [key, threshold] of Object.entries(thresholds)) {
      if (operationName.toLowerCase().includes(key.toLowerCase())) {
        return threshold;
      }
    }

    return 1000; // Default 1 second
  }

  static async runLoadTest(
    operation: () => Promise<any>,
    concurrency: number = 10,
    duration: number = 30000,
    operationName: string = 'load_test'
  ): Promise<{
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    requests_per_second: number;
    avg_response_time: number;
    error_rate: number;
  }> {
    const startTime = Date.now();
    const endTime = startTime + duration;
    const workers: Promise<void>[] = [];
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;

    // Create concurrent workers
    for (let i = 0; i < concurrency; i++) {
      const worker = (async () => {
        while (Date.now() < endTime) {
          const timerId = this.startTimer(operationName);
          try {
            await operation();
            successfulRequests++;
            this.endTimer(timerId, true);
          } catch (error) {
            failedRequests++;
            this.endTimer(timerId, false);
          }
          totalRequests++;
        }
      })();

      workers.push(worker);
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    const actualDuration = Date.now() - startTime;
    const benchmark = this.generateBenchmarkReport(operationName);

    return {
      total_requests: totalRequests,
      successful_requests: successfulRequests,
      failed_requests: failedRequests,
      requests_per_second: (totalRequests / actualDuration) * 1000,
      avg_response_time: benchmark?.avg_duration || 0,
      error_rate: totalRequests > 0 ? failedRequests / totalRequests : 0,
    };
  }
}

export default PerformanceHelpers;
