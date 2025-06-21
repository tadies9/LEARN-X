import { EventEmitter } from 'events';
import { logger } from '../../../utils/logger';
import { redisClient } from '../../../config/redis';

export interface VectorSearchMetric {
  timestamp: number;
  operation: 'search' | 'index' | 'upsert' | 'delete';
  provider: string;
  latencyMs: number;
  vectorCount?: number;
  resultCount?: number;
  dimensions?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  totalOperations: number;
  successRate: number;
  errorRate: number;
  throughput: number; // operations per second
}

export interface VectorIndexStats {
  totalVectors: number;
  indexSize: number; // bytes
  dimensions: number;
  provider: string;
  lastUpdated: Date;
  fragmentationRatio?: number;
  memoryUsage?: number;
}

export class VectorSearchMetrics extends EventEmitter {
  private static instance: VectorSearchMetrics;
  private readonly METRICS_PREFIX = 'vector:metrics:';
  private readonly WINDOW_SIZE = 3600; // 1 hour window for metrics
  private readonly MAX_SAMPLES = 10000;

  private constructor() {
    super();
  }

  static getInstance(): VectorSearchMetrics {
    if (!VectorSearchMetrics.instance) {
      VectorSearchMetrics.instance = new VectorSearchMetrics();
    }
    return VectorSearchMetrics.instance;
  }

  async recordMetric(metric: VectorSearchMetric): Promise<void> {
    try {
      const key = this.getMetricKey(metric.provider, metric.operation);
      const score = metric.timestamp;
      const value = JSON.stringify(metric);

      // Add to sorted set with timestamp as score
      await redisClient.zadd(key, score, value);

      // Remove old entries outside the window
      const cutoff = Date.now() - this.WINDOW_SIZE * 1000;
      await redisClient.zremrangebyscore(key, '-inf', cutoff);

      // Limit total entries
      const count = await redisClient.zcard(key);
      if (count > this.MAX_SAMPLES) {
        await redisClient.zremrangebyrank(key, 0, count - this.MAX_SAMPLES - 1);
      }

      // Emit metric event for real-time monitoring
      this.emit('metric', metric);

      // Log significant events
      if (metric.latencyMs > 1000) {
        logger.warn('[VectorMetrics] Slow operation detected', {
          operation: metric.operation,
          provider: metric.provider,
          latencyMs: metric.latencyMs,
        });
      }

      if (!metric.success) {
        logger.error('[VectorMetrics] Operation failed', {
          operation: metric.operation,
          provider: metric.provider,
          error: metric.error,
        });
      }
    } catch (error) {
      logger.error('[VectorMetrics] Failed to record metric', error);
    }
  }

  async getPerformanceStats(
    provider: string,
    operation: string,
    windowMinutes: number = 60
  ): Promise<PerformanceStats> {
    try {
      const key = this.getMetricKey(provider, operation);
      const cutoff = Date.now() - windowMinutes * 60 * 1000;

      // Get metrics within window
      const metricsData = await redisClient.zrangebyscore(key, cutoff, '+inf');

      if (metricsData.length === 0) {
        return this.getEmptyStats();
      }

      const metrics: VectorSearchMetric[] = metricsData.map((data) => JSON.parse(data));
      const latencies = metrics.map((m) => m.latencyMs).sort((a, b) => a - b);

      const successCount = metrics.filter((m) => m.success).length;
      const totalCount = metrics.length;

      // Calculate time range for throughput
      const timeRangeSeconds =
        (Math.max(...metrics.map((m) => m.timestamp)) -
          Math.min(...metrics.map((m) => m.timestamp))) /
        1000;

      return {
        avgLatencyMs: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
        p50LatencyMs: this.getPercentile(latencies, 0.5),
        p95LatencyMs: this.getPercentile(latencies, 0.95),
        p99LatencyMs: this.getPercentile(latencies, 0.99),
        totalOperations: totalCount,
        successRate: (successCount / totalCount) * 100,
        errorRate: ((totalCount - successCount) / totalCount) * 100,
        throughput: timeRangeSeconds > 0 ? totalCount / timeRangeSeconds : 0,
      };
    } catch (error) {
      logger.error('[VectorMetrics] Failed to get performance stats', error);
      return this.getEmptyStats();
    }
  }

  async getAggregatedStats(
    provider: string,
    windowMinutes: number = 60
  ): Promise<{
    search: PerformanceStats;
    index: PerformanceStats;
    upsert: PerformanceStats;
    delete: PerformanceStats;
    overall: PerformanceStats;
  }> {
    const [search, index, upsert, deleteStats] = await Promise.all([
      this.getPerformanceStats(provider, 'search', windowMinutes),
      this.getPerformanceStats(provider, 'index', windowMinutes),
      this.getPerformanceStats(provider, 'upsert', windowMinutes),
      this.getPerformanceStats(provider, 'delete', windowMinutes),
    ]);

    // Calculate overall stats
    const allOperations =
      search.totalOperations +
      index.totalOperations +
      upsert.totalOperations +
      deleteStats.totalOperations;

    const overall: PerformanceStats = {
      avgLatencyMs:
        allOperations > 0
          ? (search.avgLatencyMs * search.totalOperations +
              index.avgLatencyMs * index.totalOperations +
              upsert.avgLatencyMs * upsert.totalOperations +
              deleteStats.avgLatencyMs * deleteStats.totalOperations) /
            allOperations
          : 0,
      p50LatencyMs: Math.max(
        search.p50LatencyMs,
        index.p50LatencyMs,
        upsert.p50LatencyMs,
        deleteStats.p50LatencyMs
      ),
      p95LatencyMs: Math.max(
        search.p95LatencyMs,
        index.p95LatencyMs,
        upsert.p95LatencyMs,
        deleteStats.p95LatencyMs
      ),
      p99LatencyMs: Math.max(
        search.p99LatencyMs,
        index.p99LatencyMs,
        upsert.p99LatencyMs,
        deleteStats.p99LatencyMs
      ),
      totalOperations: allOperations,
      successRate:
        allOperations > 0
          ? (search.successRate * search.totalOperations +
              index.successRate * index.totalOperations +
              upsert.successRate * upsert.totalOperations +
              deleteStats.successRate * deleteStats.totalOperations) /
            allOperations
          : 100,
      errorRate:
        allOperations > 0
          ? (search.errorRate * search.totalOperations +
              index.errorRate * index.totalOperations +
              upsert.errorRate * upsert.totalOperations +
              deleteStats.errorRate * deleteStats.totalOperations) /
            allOperations
          : 0,
      throughput: search.throughput + index.throughput + upsert.throughput + deleteStats.throughput,
    };

    return { search, index, upsert, delete: deleteStats, overall };
  }

  async getTimeSeriesMetrics(
    provider: string,
    operation: string,
    intervalMinutes: number = 5,
    windowMinutes: number = 60
  ): Promise<
    Array<{
      timestamp: number;
      avgLatencyMs: number;
      operationCount: number;
      errorRate: number;
    }>
  > {
    try {
      const key = this.getMetricKey(provider, operation);
      const cutoff = Date.now() - windowMinutes * 60 * 1000;
      const intervalMs = intervalMinutes * 60 * 1000;

      const metricsData = await redisClient.zrangebyscore(key, cutoff, '+inf');
      const metrics: VectorSearchMetric[] = metricsData.map((data) => JSON.parse(data));

      // Group by interval
      const intervals = new Map<number, VectorSearchMetric[]>();

      metrics.forEach((metric) => {
        const intervalStart = Math.floor(metric.timestamp / intervalMs) * intervalMs;
        if (!intervals.has(intervalStart)) {
          intervals.set(intervalStart, []);
        }
        intervals.get(intervalStart)!.push(metric);
      });

      // Calculate stats for each interval
      return Array.from(intervals.entries())
        .map(([timestamp, intervalMetrics]) => {
          const latencies = intervalMetrics.map((m) => m.latencyMs);
          const errorCount = intervalMetrics.filter((m) => !m.success).length;

          return {
            timestamp,
            avgLatencyMs: latencies.reduce((sum, l) => sum + l, 0) / latencies.length,
            operationCount: intervalMetrics.length,
            errorRate: (errorCount / intervalMetrics.length) * 100,
          };
        })
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      logger.error('[VectorMetrics] Failed to get time series metrics', error);
      return [];
    }
  }

  async recordIndexStats(stats: VectorIndexStats): Promise<void> {
    try {
      const key = `${this.METRICS_PREFIX}index:${stats.provider}`;
      await redisClient.set(key, JSON.stringify(stats), 'EX', 86400); // 24 hour TTL

      logger.info('[VectorMetrics] Recorded index stats', {
        provider: stats.provider,
        totalVectors: stats.totalVectors,
        indexSize: stats.indexSize,
      });
    } catch (error) {
      logger.error('[VectorMetrics] Failed to record index stats', error);
    }
  }

  async getIndexStats(provider: string): Promise<VectorIndexStats | null> {
    try {
      const key = `${this.METRICS_PREFIX}index:${provider}`;
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('[VectorMetrics] Failed to get index stats', error);
      return null;
    }
  }

  private getMetricKey(provider: string, operation: string): string {
    return `${this.METRICS_PREFIX}${provider}:${operation}`;
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  private getEmptyStats(): PerformanceStats {
    return {
      avgLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      totalOperations: 0,
      successRate: 100,
      errorRate: 0,
      throughput: 0,
    };
  }

  async clearMetrics(provider?: string): Promise<void> {
    try {
      const pattern = provider ? `${this.METRICS_PREFIX}${provider}:*` : `${this.METRICS_PREFIX}*`;

      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }

      logger.info('[VectorMetrics] Cleared metrics', { provider, keysDeleted: keys.length });
    } catch (error) {
      logger.error('[VectorMetrics] Failed to clear metrics', error);
    }
  }
}

// Export singleton instance
export const vectorMetrics = VectorSearchMetrics.getInstance();
