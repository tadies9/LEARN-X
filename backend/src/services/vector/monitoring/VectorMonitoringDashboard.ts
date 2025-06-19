// import { VectorPerformanceMonitor } from './VectorPerformanceMonitor';
import { VectorSearchMetrics } from './VectorSearchMetrics';
import { supabase } from '../../../config/supabase';
import { logger } from '../../../utils/logger';

export interface DashboardMetrics {
  timestamp: Date;
  provider: string;
  totalVectors: number;
  queryLatency: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  indexHealth: {
    size: number;
    fragmentation: number;
    lastOptimized: Date;
  };
  throughput: {
    searchQps: number;
    indexQps: number;
  };
  errorRates: {
    search: number;
    index: number;
  };
  memoryUsage: {
    bufferCache: number;
    indexMemory: number;
  };
  recommendations: string[];
}

export interface PerformanceAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'latency' | 'error_rate' | 'memory' | 'fragmentation' | 'throughput';
  message: string;
  metric: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
  resolved: boolean;
}

export class VectorMonitoringDashboard {
  private metrics: VectorSearchMetrics;
  private alerts: PerformanceAlert[] = [];
  private alertThresholds = {
    latency: {
      warning: 500,
      critical: 2000,
    },
    errorRate: {
      warning: 1,
      critical: 5,
    },
    memoryUsage: {
      warning: 70, // percentage
      critical: 90,
    },
    fragmentation: {
      warning: 0.3,
      critical: 0.5,
    },
  };

  constructor(_provider: string = 'pgvector') {
    // Initialize performance monitor (commented out as it's unused)
    // new VectorPerformanceMonitor({
    //   provider: _provider,
    //   enableDetailedLogging: true,
    //   sampleRate: 1.0,
    //   alertThresholds: {
    //     latencyMs: this.alertThresholds.latency.warning,
    //     errorRate: this.alertThresholds.errorRate.warning,
    //     memoryUsageMB: 1024,
    //   },
    // });
    this.metrics = VectorSearchMetrics.getInstance();
  }

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const provider = 'pgvector';
    const windowMinutes = 60;

    try {
      // Get performance stats
      const performanceStats = await this.metrics.getAggregatedStats(provider, windowMinutes);
      
      // Get index health from PostgreSQL
      const indexHealth = await this.getPgVectorIndexHealth();
      
      // Get memory usage
      const memoryStats = await this.getPgVectorMemoryUsage();
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(performanceStats, indexHealth);

      return {
        timestamp: new Date(),
        provider,
        totalVectors: indexHealth.totalVectors,
        queryLatency: {
          avg: performanceStats.search.avgLatencyMs,
          p50: performanceStats.search.p50LatencyMs,
          p95: performanceStats.search.p95LatencyMs,
          p99: performanceStats.search.p99LatencyMs,
        },
        indexHealth: {
          size: indexHealth.indexSize,
          fragmentation: indexHealth.fragmentation,
          lastOptimized: indexHealth.lastAnalyze,
        },
        throughput: {
          searchQps: performanceStats.search.throughput,
          indexQps: performanceStats.index.throughput,
        },
        errorRates: {
          search: performanceStats.search.errorRate,
          index: performanceStats.index.errorRate,
        },
        memoryUsage: {
          bufferCache: memoryStats.bufferCache,
          indexMemory: memoryStats.estimatedTotal,
        },
        recommendations,
      };
    } catch (error) {
      logger.error('[VectorDashboard] Failed to get metrics:', error);
      throw error;
    }
  }

  /**
   * Get real-time performance metrics
   */
  async getRealTimeMetrics(intervalMinutes: number = 5): Promise<Array<{
    timestamp: number;
    searchLatency: number;
    indexLatency: number;
    searchThroughput: number;
    errorRate: number;
  }>> {
    try {
      const searchTimeSeries = await this.metrics.getTimeSeriesMetrics(
        'pgvector',
        'search',
        intervalMinutes,
        60
      );

      const indexTimeSeries = await this.metrics.getTimeSeriesMetrics(
        'pgvector',
        'index',
        intervalMinutes,
        60
      );

      // Merge time series data
      const timeSeriesMap = new Map();
      
      searchTimeSeries.forEach(point => {
        timeSeriesMap.set(point.timestamp, {
          timestamp: point.timestamp,
          searchLatency: point.avgLatencyMs,
          searchThroughput: point.operationCount / (intervalMinutes * 60),
          errorRate: point.errorRate,
          indexLatency: 0,
        });
      });

      indexTimeSeries.forEach(point => {
        const existing = timeSeriesMap.get(point.timestamp) || {
          timestamp: point.timestamp,
          searchLatency: 0,
          searchThroughput: 0,
          errorRate: 0,
        };
        existing.indexLatency = point.avgLatencyMs;
        timeSeriesMap.set(point.timestamp, existing);
      });

      return Array.from(timeSeriesMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      logger.error('[VectorDashboard] Failed to get real-time metrics:', error);
      return [];
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<PerformanceAlert[]> {
    // Update alerts based on current metrics
    await this.updateAlerts();
    
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get performance comparison between time periods
   */
  async getPerformanceComparison(
    currentWindowMinutes: number = 60,
    _previousWindowMinutes: number = 60
  ): Promise<{
    current: any;
    previous: any;
    changes: {
      latencyChange: number;
      throughputChange: number;
      errorRateChange: number;
    };
  }> {
    // const now = Date.now();
    // const _currentStart = now - (currentWindowMinutes * 60 * 1000);
    // const _previousStart = currentStart - (previousWindowMinutes * 60 * 1000);

    try {
      const currentStats = await this.metrics.getAggregatedStats('pgvector', currentWindowMinutes);
      
      // Get previous period stats (this would need custom implementation)
      // For now, we'll simulate comparison
      const previousStats = {
        search: {
          avgLatencyMs: currentStats.search.avgLatencyMs * 0.9,
          throughput: currentStats.search.throughput * 1.1,
          errorRate: currentStats.search.errorRate * 0.8,
        },
      };

      const changes = {
        latencyChange: ((currentStats.search.avgLatencyMs - previousStats.search.avgLatencyMs) / 
                       previousStats.search.avgLatencyMs) * 100,
        throughputChange: ((currentStats.search.throughput - previousStats.search.throughput) / 
                          previousStats.search.throughput) * 100,
        errorRateChange: ((currentStats.search.errorRate - previousStats.search.errorRate) / 
                         Math.max(previousStats.search.errorRate, 0.1)) * 100,
      };

      return {
        current: currentStats,
        previous: previousStats,
        changes,
      };
    } catch (error) {
      logger.error('[VectorDashboard] Failed to get performance comparison:', error);
      throw error;
    }
  }

  /**
   * Get pgVector specific index health
   */
  private async getPgVectorIndexHealth(): Promise<{
    totalVectors: number;
    indexSize: number;
    fragmentation: number;
    lastAnalyze: Date;
  }> {
    try {
      const { data: indexStats, error } = await supabase.rpc('get_pgvector_index_stats');

      if (error) {
        throw error;
      }

      const stats = indexStats?.[0] || {};
      
      return {
        totalVectors: stats.total_vectors || 0,
        indexSize: stats.index_size_bytes || 0,
        fragmentation: stats.fragmentation_ratio || 0,
        lastAnalyze: stats.last_analyze ? new Date(stats.last_analyze) : new Date(),
      };
    } catch (error) {
      logger.error('[VectorDashboard] Failed to get index health:', error);
      return {
        totalVectors: 0,
        indexSize: 0,
        fragmentation: 0,
        lastAnalyze: new Date(),
      };
    }
  }

  /**
   * Get pgVector memory usage statistics
   */
  private async getPgVectorMemoryUsage(): Promise<{
    bufferCache: number;
    estimatedTotal: number;
  }> {
    try {
      const { data: memStats, error } = await supabase.rpc('get_pgvector_memory_stats');

      if (error) {
        throw error;
      }

      const bufferCacheStats = memStats?.find((stat: any) => stat.stat_name === 'buffer_cache_usage');
      const sharedMemoryStats = memStats?.find((stat: any) => stat.stat_name === 'shared_memory_size');

      return {
        bufferCache: bufferCacheStats?.memory_usage_mb || 0,
        estimatedTotal: (bufferCacheStats?.memory_usage_mb || 0) + 
                       (sharedMemoryStats?.memory_usage_mb || 0) * 0.1, // Estimate 10% of shared memory
      };
    } catch (error) {
      logger.error('[VectorDashboard] Failed to get memory usage:', error);
      return {
        bufferCache: 0,
        estimatedTotal: 0,
      };
    }
  }

  /**
   * Generate performance recommendations
   */
  private async generateRecommendations(
    performanceStats: any,
    indexHealth: any
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Latency recommendations
    if (performanceStats.search.avgLatencyMs > 500) {
      recommendations.push('Search latency is high. Consider optimizing indexes or increasing hardware resources.');
    }

    if (performanceStats.search.p99LatencyMs > 2000) {
      recommendations.push('P99 latency is very high. Investigate slow queries and consider query optimization.');
    }

    // Index health recommendations
    if (indexHealth.fragmentation > 0.3) {
      recommendations.push('Index fragmentation is high. Consider running REINDEX to optimize performance.');
    }

    // Error rate recommendations
    if (performanceStats.search.errorRate > 1) {
      recommendations.push('Error rate is elevated. Check logs for specific error patterns and causes.');
    }

    // Throughput recommendations
    if (performanceStats.search.throughput < 10) {
      recommendations.push('Search throughput is low. Consider optimizing query patterns or scaling resources.');
    }

    // Scale recommendations
    if (indexHealth.totalVectors > 1000000) {
      recommendations.push('Vector count is high. Consider migrating to a dedicated vector database for better performance.');
    }

    // Get optimal index parameters
    try {
      const { data: optimalParams } = await supabase.rpc('estimate_optimal_index_params', {
        total_vectors: indexHealth.totalVectors,
        target_recall: 0.95,
      });

      if (optimalParams && optimalParams.length > 0) {
        const ivfFlatParams = optimalParams.find((p: any) => p.index_type === 'ivfflat');
        if (ivfFlatParams) {
          recommendations.push(
            `Consider using IVFFlat index with lists=${ivfFlatParams.recommended_lists} for better performance.`
          );
        }

        const hnswParams = optimalParams.find((p: any) => p.index_type === 'hnsw');
        if (hnswParams && indexHealth.totalVectors < 500000) {
          recommendations.push(
            `For datasets under 500K vectors, consider HNSW index for better query performance.`
          );
        }
      }
    } catch (error) {
      logger.warn('[VectorDashboard] Failed to get optimal index parameters:', error);
    }

    return recommendations;
  }

  /**
   * Update performance alerts
   */
  private async updateAlerts(): Promise<void> {
    try {
      const metrics = await this.getDashboardMetrics();
      const newAlerts: PerformanceAlert[] = [];

      // Check latency alerts
      if (metrics.queryLatency.avg > this.alertThresholds.latency.critical) {
        newAlerts.push({
          id: `latency-critical-${Date.now()}`,
          severity: 'critical',
          type: 'latency',
          message: 'Average query latency is critically high',
          metric: 'avg_latency_ms',
          threshold: this.alertThresholds.latency.critical,
          currentValue: metrics.queryLatency.avg,
          timestamp: new Date(),
          resolved: false,
        });
      } else if (metrics.queryLatency.avg > this.alertThresholds.latency.warning) {
        newAlerts.push({
          id: `latency-warning-${Date.now()}`,
          severity: 'medium',
          type: 'latency',
          message: 'Average query latency is elevated',
          metric: 'avg_latency_ms',
          threshold: this.alertThresholds.latency.warning,
          currentValue: metrics.queryLatency.avg,
          timestamp: new Date(),
          resolved: false,
        });
      }

      // Check error rate alerts
      if (metrics.errorRates.search > this.alertThresholds.errorRate.critical) {
        newAlerts.push({
          id: `error-rate-critical-${Date.now()}`,
          severity: 'critical',
          type: 'error_rate',
          message: 'Search error rate is critically high',
          metric: 'search_error_rate',
          threshold: this.alertThresholds.errorRate.critical,
          currentValue: metrics.errorRates.search,
          timestamp: new Date(),
          resolved: false,
        });
      }

      // Check fragmentation alerts
      if (metrics.indexHealth.fragmentation > this.alertThresholds.fragmentation.critical) {
        newAlerts.push({
          id: `fragmentation-critical-${Date.now()}`,
          severity: 'high',
          type: 'fragmentation',
          message: 'Index fragmentation is critically high',
          metric: 'fragmentation_ratio',
          threshold: this.alertThresholds.fragmentation.critical,
          currentValue: metrics.indexHealth.fragmentation,
          timestamp: new Date(),
          resolved: false,
        });
      }

      // Add new alerts and remove duplicates
      const alertMap = new Map();
      [...this.alerts, ...newAlerts].forEach(alert => {
        const key = `${alert.type}-${alert.severity}`;
        if (!alertMap.has(key) || alertMap.get(key).timestamp < alert.timestamp) {
          alertMap.set(key, alert);
        }
      });

      this.alerts = Array.from(alertMap.values());

      // Log new critical alerts
      newAlerts
        .filter(alert => alert.severity === 'critical')
        .forEach(alert => {
          logger.error('[VectorDashboard] Critical alert generated:', alert);
        });

    } catch (error) {
      logger.error('[VectorDashboard] Failed to update alerts:', error);
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      logger.info('[VectorDashboard] Alert resolved:', alertId);
    }
  }

  /**
   * Start monitoring dashboard with periodic updates
   */
  startMonitoring(intervalMs: number = 300000): NodeJS.Timeout {
    logger.info('[VectorDashboard] Starting monitoring dashboard');
    
    return setInterval(async () => {
      try {
        await this.updateAlerts();
        
        // Log summary metrics every 5 minutes
        const metrics = await this.getDashboardMetrics();
        logger.info('[VectorDashboard] Performance summary:', {
          totalVectors: metrics.totalVectors,
          avgLatency: metrics.queryLatency.avg.toFixed(2),
          searchQps: metrics.throughput.searchQps.toFixed(2),
          errorRate: metrics.errorRates.search.toFixed(2),
          fragmentation: metrics.indexHealth.fragmentation.toFixed(3),
        });
      } catch (error) {
        logger.error('[VectorDashboard] Monitoring update failed:', error);
      }
    }, intervalMs);
  }
}

// Export singleton instance
export const vectorDashboard = new VectorMonitoringDashboard();