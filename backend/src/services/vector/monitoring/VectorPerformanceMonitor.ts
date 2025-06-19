import { VectorSearchMetrics, VectorSearchMetric, vectorMetrics } from './VectorSearchMetrics';
import { logger } from '../../../utils/logger';
import { supabase } from '../../../config/supabase';

export interface MonitoringConfig {
  provider: string;
  enableDetailedLogging?: boolean;
  sampleRate?: number; // 0-1, percentage of operations to monitor
  alertThresholds?: {
    latencyMs?: number;
    errorRate?: number;
    memoryUsageMB?: number;
  };
}

export class VectorPerformanceMonitor {
  private config: MonitoringConfig;
  private metrics: VectorSearchMetrics;

  constructor(config: MonitoringConfig) {
    this.config = {
      enableDetailedLogging: false,
      sampleRate: 1.0,
      alertThresholds: {
        latencyMs: 1000,
        errorRate: 5,
        memoryUsageMB: 1024,
      },
      ...config,
    };
    this.metrics = vectorMetrics;
  }

  /**
   * Monitors a vector search operation
   */
  async monitorSearch<T>(
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    return this.monitorOperation('search', operation, metadata);
  }

  /**
   * Monitors a vector indexing operation
   */
  async monitorIndex<T>(
    operation: () => Promise<T>,
    vectorCount: number,
    dimensions: number,
    metadata?: Record<string, any>
  ): Promise<T> {
    return this.monitorOperation('index', operation, {
      vectorCount,
      dimensions,
      ...metadata,
    });
  }

  /**
   * Monitors a vector upsert operation
   */
  async monitorUpsert<T>(
    operation: () => Promise<T>,
    vectorCount: number,
    metadata?: Record<string, any>
  ): Promise<T> {
    return this.monitorOperation('upsert', operation, {
      vectorCount,
      ...metadata,
    });
  }

  /**
   * Monitors a vector delete operation
   */
  async monitorDelete<T>(
    operation: () => Promise<T>,
    vectorCount: number,
    metadata?: Record<string, any>
  ): Promise<T> {
    return this.monitorOperation('delete', operation, {
      vectorCount,
      ...metadata,
    });
  }

  /**
   * Generic operation monitor
   */
  private async monitorOperation<T>(
    operationType: 'search' | 'index' | 'upsert' | 'delete',
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    // Check sample rate
    if (Math.random() > (this.config?.sampleRate || 0.1)) {
      return operation();
    }

    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    let success = true;
    let error: string | undefined;
    let result: T;

    try {
      result = await operation();
      
      // Extract result metadata if available
      if (operationType === 'search' && result && typeof result === 'object') {
        const searchResult = result as any;
        if (searchResult.results && Array.isArray(searchResult.results)) {
          metadata = {
            ...metadata,
            resultCount: searchResult.results.length,
          };
        }
      }
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const endTime = Date.now();
      const endMemory = process.memoryUsage();
      const latencyMs = endTime - startTime;
      const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

      // Record metric
      const metric: VectorSearchMetric = {
        timestamp: startTime,
        operation: operationType,
        provider: this.config.provider,
        latencyMs,
        success,
        error,
        metadata: {
          ...metadata,
          memoryDeltaBytes: memoryDelta,
          memoryUsedMB: Math.round(endMemory.heapUsed / 1024 / 1024),
        },
      };

      if (metadata?.vectorCount) {
        metric.vectorCount = metadata.vectorCount;
      }
      if (metadata?.resultCount) {
        metric.resultCount = metadata.resultCount;
      }
      if (metadata?.dimensions) {
        metric.dimensions = metadata.dimensions;
      }

      await this.metrics.recordMetric(metric);

      // Check alerts
      this.checkAlerts(metric);

      // Detailed logging if enabled
      if (this.config.enableDetailedLogging) {
        logger.debug('[VectorMonitor] Operation completed', {
          operation: operationType,
          provider: this.config.provider,
          latencyMs,
          success,
          metadata,
        });
      }
    }

    return result!;
  }

  /**
   * Monitors pgvector specific metrics
   */
  async monitorPgvectorHealth(): Promise<void> {
    try {
      // Check index size and stats
      const { data: indexStats, error: indexError } = await supabase.rpc(
        'get_pgvector_index_stats',
        {}
      );

      if (indexError) {
        logger.error('[VectorMonitor] Failed to get pgvector stats', indexError);
        return;
      }

      // Check memory usage
      const { data: memStats, error: memError } = await supabase.rpc(
        'get_pgvector_memory_stats',
        {}
      );

      if (memError) {
        logger.error('[VectorMonitor] Failed to get memory stats', memError);
      }

      // Record index stats
      if (indexStats && indexStats.length > 0) {
        const stats = indexStats[0];
        await this.metrics.recordIndexStats({
          totalVectors: stats.total_vectors || 0,
          indexSize: stats.index_size_bytes || 0,
          dimensions: stats.dimensions || 1536,
          provider: 'pgvector',
          lastUpdated: new Date(),
          fragmentationRatio: stats.fragmentation_ratio,
          memoryUsage: memStats?.[0]?.memory_usage_mb,
        });
      }
    } catch (error) {
      logger.error('[VectorMonitor] Health check failed', error);
    }
  }

  /**
   * Check if metrics exceed alert thresholds
   */
  private checkAlerts(metric: VectorSearchMetric): void {
    const { alertThresholds } = this.config;
    if (!alertThresholds) return;

    // Check latency threshold
    if (alertThresholds.latencyMs && metric.latencyMs > alertThresholds.latencyMs) {
      logger.warn('[VectorMonitor] High latency detected', {
        operation: metric.operation,
        provider: metric.provider,
        latencyMs: metric.latencyMs,
        threshold: alertThresholds.latencyMs,
      });
    }

    // Check memory usage
    if (alertThresholds.memoryUsageMB && metric.metadata?.memoryUsedMB) {
      if (metric.metadata.memoryUsedMB > alertThresholds.memoryUsageMB) {
        logger.warn('[VectorMonitor] High memory usage detected', {
          operation: metric.operation,
          provider: metric.provider,
          memoryUsedMB: metric.metadata.memoryUsedMB,
          threshold: alertThresholds.memoryUsageMB,
        });
      }
    }
  }

  /**
   * Start periodic health monitoring
   */
  startHealthMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(async () => {
      if (this.config.provider === 'pgvector') {
        await this.monitorPgvectorHealth();
      }
      
      // Check error rates
      const stats = await this.metrics.getPerformanceStats(
        this.config.provider,
        'search',
        5 // last 5 minutes
      );

      if (this.config.alertThresholds?.errorRate && 
          stats.errorRate > this.config.alertThresholds.errorRate) {
        logger.error('[VectorMonitor] High error rate detected', {
          provider: this.config.provider,
          errorRate: stats.errorRate,
          threshold: this.config.alertThresholds.errorRate,
        });
      }
    }, intervalMs);
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(windowMinutes: number = 60): Promise<{
    provider: string;
    window: string;
    stats: any;
    recommendations: string[];
  }> {
    const stats = await this.metrics.getAggregatedStats(this.config.provider, windowMinutes);
    const indexStats = await this.metrics.getIndexStats(this.config.provider);
    
    const recommendations: string[] = [];

    // Analyze search performance
    if (stats.search.avgLatencyMs > 500) {
      recommendations.push('Consider adding more specific indexes or reducing vector dimensions');
    }
    if (stats.search.p99LatencyMs > 2000) {
      recommendations.push('P99 latency is high - investigate slow queries or consider caching');
    }

    // Analyze index performance
    if (stats.index.avgLatencyMs > 1000) {
      recommendations.push('Index operations are slow - consider batch processing or async indexing');
    }

    // Analyze error rates
    if (stats.overall.errorRate > 1) {
      recommendations.push('Error rate is above 1% - investigate failure patterns');
    }

    // Analyze index health
    if (indexStats) {
      if (indexStats.fragmentationRatio && indexStats.fragmentationRatio > 0.3) {
        recommendations.push('Index fragmentation is high - consider reindexing');
      }
      if (indexStats.totalVectors > 1000000) {
        recommendations.push('Vector count is high - consider sharding or using dedicated vector DB');
      }
    }

    return {
      provider: this.config.provider,
      window: `${windowMinutes} minutes`,
      stats: {
        aggregate: stats,
        index: indexStats,
      },
      recommendations,
    };
  }
}