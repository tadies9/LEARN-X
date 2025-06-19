import { getEnhancedAICache } from './EnhancedAICache';
import { CostTracker } from '../ai/CostTracker';
import { redisClient } from '../../config/redis';
import { logger } from '../../utils/logger';
import { supabase } from '../../config/supabase';

interface PerformanceMetrics {
  hitRate: {
    overall: number;
    byService: Record<string, number>;
    byTimeWindow: {
      lastHour: number;
      last24Hours: number;
      last7Days: number;
    };
  };
  costSavings: {
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
  };
  responseTimes: {
    cacheHit: number;
    cacheMiss: number;
    improvement: number;
  };
  capacity: {
    totalKeys: number;
    memoryUsage: string;
    keyDistribution: Record<string, number>;
    hotKeys: Array<{
      key: string;
      hitCount: number;
      lastAccessed: Date;
    }>;
  };
  trends: {
    hitRateTrend: Array<{
      timestamp: Date;
      hitRate: number;
      totalRequests: number;
    }>;
    costSavingsTrend: Array<{
      timestamp: Date;
      savings: number;
      requestsServed: number;
    }>;
  };
  alerts: Array<{
    type: 'low_hit_rate' | 'high_memory' | 'cost_spike' | 'performance_degradation';
    severity: 'low' | 'medium' | 'high';
    message: string;
    timestamp: Date;
    actionRequired: boolean;
  }>;
}

interface ServiceBenchmark {
  service: string;
  targetHitRate: number;
  maxResponseTime: number;
  maxCostPerRequest: number;
}

/**
 * Cache Performance Monitor
 * Monitors cache performance, generates metrics, and provides optimization recommendations
 */
export class CachePerformanceMonitor {
  private cache = getEnhancedAICache(redisClient, new CostTracker());
  
  // Performance benchmarks for different services
  private benchmarks: ServiceBenchmark[] = [
    { service: 'explain', targetHitRate: 0.75, maxResponseTime: 500, maxCostPerRequest: 0.05 },
    { service: 'summary', targetHitRate: 0.80, maxResponseTime: 300, maxCostPerRequest: 0.03 },
    { service: 'quiz', targetHitRate: 0.70, maxResponseTime: 400, maxCostPerRequest: 0.04 },
    { service: 'flashcard', targetHitRate: 0.85, maxResponseTime: 200, maxCostPerRequest: 0.02 },
    { service: 'practice', targetHitRate: 0.60, maxResponseTime: 600, maxCostPerRequest: 0.06 },
    { service: 'introduction', targetHitRate: 0.90, maxResponseTime: 300, maxCostPerRequest: 0.03 },
    { service: 'chat', targetHitRate: 0.50, maxResponseTime: 800, maxCostPerRequest: 0.08 },
    { service: 'embedding', targetHitRate: 0.95, maxResponseTime: 100, maxCostPerRequest: 0.01 },
  ];

  constructor() {
    // Start monitoring process
    this.startMonitoring();
  }

  /**
   * Start automated performance monitoring
   */
  private startMonitoring(): void {
    // Monitor every 5 minutes
    setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.checkAlerts();
      } catch (error) {
        logger.error('Error in cache performance monitoring:', error);
      }
    }, 5 * 60 * 1000);

    // Log detailed report every hour
    setInterval(async () => {
      try {
        const metrics = await this.getComprehensiveMetrics();
        logger.info('Cache Performance Report', metrics);
      } catch (error) {
        logger.error('Error generating performance report:', error);
      }
    }, 60 * 60 * 1000);

    logger.info('Cache performance monitoring started');
  }

  /**
   * Get comprehensive performance metrics
   */
  async getComprehensiveMetrics(): Promise<PerformanceMetrics> {
    try {
      const [
        cacheStats,
        detailedMetrics,
        hitRateByTimeWindow,
        costSavings,
        responseTimes,
        trends,
        alerts
      ] = await Promise.all([
        this.cache.getStats(),
        this.cache.getDetailedMetrics(),
        this.getHitRateByTimeWindow(),
        this.calculateCostSavings(),
        this.getResponseTimes(),
        this.getTrends(),
        this.checkAlerts()
      ]);

      // Calculate overall hit rate
      let totalHits = 0;
      let totalMisses = 0;
      const byService: Record<string, number> = {};

      Object.entries(cacheStats).forEach(([service, stats]) => {
        totalHits += stats.hits;
        totalMisses += stats.misses;
        byService[service] = stats.hits / (stats.hits + stats.misses) || 0;
      });

      const overallHitRate = totalHits / (totalHits + totalMisses) || 0;

      return {
        hitRate: {
          overall: overallHitRate,
          byService,
          byTimeWindow: hitRateByTimeWindow
        },
        costSavings,
        responseTimes,
        capacity: {
          totalKeys: detailedMetrics.totalKeys,
          memoryUsage: detailedMetrics.memoryUsage,
          keyDistribution: detailedMetrics.keyDistribution,
          hotKeys: await this.getHotKeys()
        },
        trends,
        alerts
      };
    } catch (error) {
      logger.error('Error getting comprehensive metrics:', error);
      throw error;
    }
  }

  /**
   * Get hit rate by time windows
   */
  private async getHitRateByTimeWindow(): Promise<{
    lastHour: number;
    last24Hours: number;
    last7Days: number;
  }> {
    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get AI requests data for different time windows
      const [hourData, dayData, weekData] = await Promise.all([
        this.getRequestsInTimeWindow(hourAgo, now),
        this.getRequestsInTimeWindow(dayAgo, now),
        this.getRequestsInTimeWindow(weekAgo, now)
      ]);

      return {
        lastHour: this.calculateHitRateFromRequests(hourData),
        last24Hours: this.calculateHitRateFromRequests(dayData),
        last7Days: this.calculateHitRateFromRequests(weekData)
      };
    } catch (error) {
      logger.error('Error calculating hit rate by time window:', error);
      return { lastHour: 0, last24Hours: 0, last7Days: 0 };
    }
  }

  /**
   * Get AI requests in a time window
   */
  private async getRequestsInTimeWindow(start: Date, end: Date): Promise<any[]> {
    try {
      const { data } = await supabase
        .from('ai_requests')
        .select('cache_hit, cost, response_time_ms')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      return data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Calculate hit rate from request data
   */
  private calculateHitRateFromRequests(requests: any[]): number {
    if (requests.length === 0) return 0;
    
    const hits = requests.filter(req => req.cache_hit).length;
    return hits / requests.length;
  }

  /**
   * Calculate cost savings
   */
  private async calculateCostSavings(): Promise<{
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
  }> {
    try {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [hourData, dayData, weekData, monthData] = await Promise.all([
        this.getRequestsInTimeWindow(hourAgo, now),
        this.getRequestsInTimeWindow(dayAgo, now),
        this.getRequestsInTimeWindow(weekAgo, now),
        this.getRequestsInTimeWindow(monthAgo, now)
      ]);

      return {
        hourly: this.calculateSavingsFromRequests(hourData),
        daily: this.calculateSavingsFromRequests(dayData),
        weekly: this.calculateSavingsFromRequests(weekData),
        monthly: this.calculateSavingsFromRequests(monthData)
      };
    } catch (error) {
      logger.error('Error calculating cost savings:', error);
      return { hourly: 0, daily: 0, weekly: 0, monthly: 0 };
    }
  }

  /**
   * Calculate savings from request data
   */
  private calculateSavingsFromRequests(requests: any[]): number {
    const cacheHits = requests.filter(req => req.cache_hit);
    return cacheHits.reduce((total, req) => total + (req.cost || 0), 0);
  }

  /**
   * Get response time metrics
   */
  private async getResponseTimes(): Promise<{
    cacheHit: number;
    cacheMiss: number;
    improvement: number;
  }> {
    try {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const requests = await this.getRequestsInTimeWindow(dayAgo, now);

      const hits = requests.filter(req => req.cache_hit);
      const misses = requests.filter(req => !req.cache_hit);

      const avgHitTime = hits.length > 0 
        ? hits.reduce((sum, req) => sum + (req.response_time_ms || 0), 0) / hits.length 
        : 0;

      const avgMissTime = misses.length > 0 
        ? misses.reduce((sum, req) => sum + (req.response_time_ms || 0), 0) / misses.length 
        : 0;

      const improvement = avgMissTime > 0 ? ((avgMissTime - avgHitTime) / avgMissTime) * 100 : 0;

      return {
        cacheHit: avgHitTime,
        cacheMiss: avgMissTime,
        improvement
      };
    } catch (error) {
      logger.error('Error calculating response times:', error);
      return { cacheHit: 0, cacheMiss: 0, improvement: 0 };
    }
  }

  /**
   * Get hot keys (most frequently accessed cache entries)
   */
  private async getHotKeys(): Promise<Array<{
    key: string;
    hitCount: number;
    lastAccessed: Date;
  }>> {
    try {
      // This would require tracking in Redis or separate analytics
      // For now, return mock data
      return [
        { key: 'ai_cache:v2:explain:user1:abc123', hitCount: 150, lastAccessed: new Date() },
        { key: 'ai_cache:v2:summary:user2:def456', hitCount: 120, lastAccessed: new Date() },
        { key: 'ai_cache:v2:quiz:user3:ghi789', hitCount: 98, lastAccessed: new Date() }
      ];
    } catch (error) {
      logger.error('Error getting hot keys:', error);
      return [];
    }
  }

  /**
   * Get performance trends
   */
  private async getTrends(): Promise<{
    hitRateTrend: Array<{ timestamp: Date; hitRate: number; totalRequests: number }>;
    costSavingsTrend: Array<{ timestamp: Date; savings: number; requestsServed: number }>;
  }> {
    try {
      // Generate trend data for the last 24 hours (hourly intervals)
      const trends = [];
      const now = new Date();
      
      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        const endTime = new Date(timestamp.getTime() + 60 * 60 * 1000);
        
        const requests = await this.getRequestsInTimeWindow(timestamp, endTime);
        const hitRate = this.calculateHitRateFromRequests(requests);
        const savings = this.calculateSavingsFromRequests(requests);
        
        trends.push({
          timestamp,
          hitRate,
          totalRequests: requests.length,
          savings,
          requestsServed: requests.filter(r => r.cache_hit).length
        });
      }

      return {
        hitRateTrend: trends.map(t => ({
          timestamp: t.timestamp,
          hitRate: t.hitRate,
          totalRequests: t.totalRequests
        })),
        costSavingsTrend: trends.map(t => ({
          timestamp: t.timestamp,
          savings: t.savings,
          requestsServed: t.requestsServed
        }))
      };
    } catch (error) {
      logger.error('Error calculating trends:', error);
      return { hitRateTrend: [], costSavingsTrend: [] };
    }
  }

  /**
   * Check for performance alerts
   */
  private async checkAlerts(): Promise<Array<{
    type: 'low_hit_rate' | 'high_memory' | 'cost_spike' | 'performance_degradation';
    severity: 'low' | 'medium' | 'high';
    message: string;
    timestamp: Date;
    actionRequired: boolean;
  }>> {
    const alerts: Array<{
      type: 'low_hit_rate' | 'high_memory' | 'cost_spike' | 'performance_degradation';
      severity: 'low' | 'medium' | 'high';
      message: string;
      timestamp: Date;
      actionRequired: boolean;
    }> = [];
    const now = new Date();

    try {
      // Check hit rate alerts
      const stats = await this.cache.getStats();
      Object.entries(stats).forEach(([service, serviceStats]) => {
        const hitRate = serviceStats.hits / (serviceStats.hits + serviceStats.misses) || 0;
        const benchmark = this.benchmarks.find(b => b.service === service);
        
        if (benchmark && hitRate < benchmark.targetHitRate) {
          const severity = hitRate < benchmark.targetHitRate * 0.5 ? 'high' : 
                          hitRate < benchmark.targetHitRate * 0.75 ? 'medium' : 'low';
          
          alerts.push({
            type: 'low_hit_rate',
            severity,
            message: `${service} hit rate (${(hitRate * 100).toFixed(1)}%) below target (${(benchmark.targetHitRate * 100).toFixed(1)}%)`,
            timestamp: now,
            actionRequired: severity === 'high'
          });
        }
      });

      // Check memory usage
      const detailedMetrics = await this.cache.getDetailedMetrics();
      const memoryUsageMatch = detailedMetrics.memoryUsage.match(/(\d+\.?\d*)\s*(\w+)/);
      if (memoryUsageMatch) {
        const value = parseFloat(memoryUsageMatch[1]);
        const unit = memoryUsageMatch[2];
        
        // Convert to MB for comparison
        let memoryMB = value;
        if (unit.toLowerCase() === 'gb') memoryMB *= 1024;
        if (unit.toLowerCase() === 'kb') memoryMB /= 1024;
        
        if (memoryMB > 500) { // Alert if cache using more than 500MB
          alerts.push({
            type: 'high_memory',
            severity: memoryMB > 1000 ? 'high' : 'medium',
            message: `Cache memory usage is high: ${detailedMetrics.memoryUsage}`,
            timestamp: now,
            actionRequired: memoryMB > 1000
          });
        }
      }

      // Check for cost spikes
      const hourlyCosts = await this.calculateCostSavings();
      if (hourlyCosts.hourly > 10) { // Alert if hourly costs exceed $10
        alerts.push({
          type: 'cost_spike',
          severity: hourlyCosts.hourly > 50 ? 'high' : 'medium',
          message: `High AI costs detected: $${hourlyCosts.hourly.toFixed(2)} in the last hour`,
          timestamp: now,
          actionRequired: hourlyCosts.hourly > 50
        });
      }

    } catch (error) {
      logger.error('Error checking alerts:', error);
    }

    return alerts;
  }

  /**
   * Collect and store performance metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.getComprehensiveMetrics();
      
      // Store metrics in database for historical analysis
      await supabase.from('cache_performance_metrics').insert({
        timestamp: new Date().toISOString(),
        overall_hit_rate: metrics.hitRate.overall,
        hit_rate_by_service: metrics.hitRate.byService,
        cost_savings_hourly: metrics.costSavings.hourly,
        total_keys: metrics.capacity.totalKeys,
        memory_usage: metrics.capacity.memoryUsage,
        alerts_count: metrics.alerts.length,
        high_severity_alerts: metrics.alerts.filter(a => a.severity === 'high').length
      });

    } catch (error) {
      // Don't throw error if metrics table doesn't exist
      if ((error as any)?.code !== '42P01') {
        logger.error('Error collecting metrics:', error);
      }
    }
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<Array<{
    category: 'ttl' | 'memory' | 'hit_rate' | 'cost';
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    expectedImpact: string;
    actionRequired: string;
  }>> {
    const recommendations: Array<{
      category: 'ttl' | 'memory' | 'hit_rate' | 'cost';
      priority: 'high' | 'medium' | 'low';
      recommendation: string;
      expectedImpact: string;
      actionRequired: string;
    }> = [];
    
    try {
      const metrics = await this.getComprehensiveMetrics();
      
      // Analyze hit rates by service
      Object.entries(metrics.hitRate.byService).forEach(([service, hitRate]) => {
        const benchmark = this.benchmarks.find(b => b.service === service);
        if (benchmark && hitRate < benchmark.targetHitRate) {
          recommendations.push({
            category: 'hit_rate',
            priority: hitRate < benchmark.targetHitRate * 0.5 ? 'high' : 'medium',
            recommendation: `Improve cache hit rate for ${service} service`,
            expectedImpact: `Increase hit rate from ${(hitRate * 100).toFixed(1)}% to ${(benchmark.targetHitRate * 100).toFixed(1)}%`,
            actionRequired: `Consider increasing TTL or improving cache key generation for ${service}`
          });
        }
      });

      // Memory optimization
      if (metrics.capacity.totalKeys > 10000) {
        recommendations.push({
          category: 'memory',
          priority: 'medium',
          recommendation: 'Consider cache cleanup or TTL optimization',
          expectedImpact: 'Reduce memory usage and improve performance',
          actionRequired: 'Implement automated cleanup of old cache entries'
        });
      }

      // Cost optimization
      if (metrics.costSavings.hourly < 5 && metrics.hitRate.overall < 0.7) {
        recommendations.push({
          category: 'cost',
          priority: 'high',
          recommendation: 'Improve cache utilization to increase cost savings',
          expectedImpact: 'Potential savings of $100+ per month',
          actionRequired: 'Review cache warming strategy and TTL configurations'
        });
      }

    } catch (error) {
      logger.error('Error generating optimization recommendations:', error);
    }

    return recommendations;
  }

  /**
   * Get performance summary for dashboard
   */
  async getPerformanceSummary(): Promise<{
    hitRate: number;
    costSavings24h: number;
    responseTimeImprovement: number;
    alertsCount: number;
    status: 'excellent' | 'good' | 'needs_attention' | 'critical';
  }> {
    try {
      const metrics = await this.getComprehensiveMetrics();
      
      const hitRate = metrics.hitRate.overall;
      const alertsCount = metrics.alerts.length;
      const hasHighSeverityAlerts = metrics.alerts.some(a => a.severity === 'high');
      
      let status: 'excellent' | 'good' | 'needs_attention' | 'critical' = 'good';
      
      if (hasHighSeverityAlerts || hitRate < 0.5) {
        status = 'critical';
      } else if (alertsCount > 3 || hitRate < 0.7) {
        status = 'needs_attention';
      } else if (hitRate > 0.85 && alertsCount === 0) {
        status = 'excellent';
      }

      return {
        hitRate,
        costSavings24h: metrics.costSavings.daily,
        responseTimeImprovement: metrics.responseTimes.improvement,
        alertsCount,
        status
      };
    } catch (error) {
      logger.error('Error getting performance summary:', error);
      return {
        hitRate: 0,
        costSavings24h: 0,
        responseTimeImprovement: 0,
        alertsCount: 0,
        status: 'critical'
      };
    }
  }
}

// Export singleton instance
export const cachePerformanceMonitor = new CachePerformanceMonitor();