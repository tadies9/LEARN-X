import { logger } from '../../utils/logger';
import { CostTracker } from '../ai/CostTracker';
import { getEnhancedAICache } from '../cache/EnhancedAICache';
import { openAICircuitBreaker, embeddingCircuitBreaker } from '../ai/CircuitBreaker';
import { supabase } from '../../config/supabase';
import { redisClient } from '../../config/redis';

interface SystemOverview {
  users: {
    total: number;
    active: number;
    new: number;
  };
  ai: {
    requestsToday: number;
    costToday: number;
    cacheHitRate: number;
    avgResponseTime: number;
  };
  storage: {
    totalFiles: number;
    totalSize: string;
    processedFiles: number;
  };
  performance: {
    uptime: number;
    errorRate: number;
    avgApiLatency: number;
  };
}

interface CostAnalytics {
  summary: {
    todaySpend: number;
    weekSpend: number;
    monthSpend: number;
    projectedMonthly: number;
  };
  byModel: Record<string, { requests: number; cost: number }>;
  byService: Record<string, { requests: number; cost: number }>;
  topUsers: Array<{
    userId: string;
    email: string;
    totalSpend: number;
    requestCount: number;
  }>;
  hourlyTrend: Array<{
    hour: number;
    cost: number;
    requests: number;
  }>;
}

interface PerformanceMetrics {
  circuits: {
    openAI: {
      state: string;
      failureRate: number;
      lastFailure?: Date;
    };
    embeddings: {
      state: string;
      failureRate: number;
      lastFailure?: Date;
    };
  };
  cache: {
    hitRate: number;
    totalKeys: number;
    memoryUsage: string;
    costSavings: {
      daily: number;
      monthly: number;
    };
  };
  database: {
    activeConnections: number;
    avgQueryTime: number;
    slowQueries: Array<{
      query: string;
      duration: number;
      timestamp: Date;
    }>;
  };
  queue: {
    pending: number;
    processing: number;
    failed: number;
    avgProcessingTime: number;
  };
}

/**
 * Admin dashboard service for system monitoring and analytics
 */
export class AdminDashboardService {
  private costTracker: CostTracker;
  private aiCache: ReturnType<typeof getEnhancedAICache>;

  constructor() {
    this.costTracker = new CostTracker();
    this.aiCache = getEnhancedAICache(redisClient, this.costTracker);
  }

  /**
   * Get system overview
   */
  async getOverview(): Promise<SystemOverview> {
    try {
      const [users, ai, storage, performance] = await Promise.all([
        this.getUserMetrics(),
        this.getAIMetrics(),
        this.getStorageMetrics(),
        this.getBasicPerformanceMetrics(),
      ]);

      return {
        users,
        ai,
        storage,
        performance,
      };
    } catch (error) {
      logger.error('Error getting system overview:', error);
      throw error;
    }
  }

  /**
   * Get detailed cost analytics
   */
  async getCostAnalytics(_timeRange: { start: Date; end: Date }): Promise<CostAnalytics> {
    try {
      const stats = await this.costTracker.getDashboardStats();

      // Get spending summary
      const todaySpend = stats.today.cost;
      const weekSpend = await this.getWeekSpend();
      const monthSpend = await this.getMonthSpend();
      const projectedMonthly = this.projectMonthlySpend(todaySpend);

      // Get top users by spend
      const topUsers = await this.getTopUsersBySpend(10);

      return {
        summary: {
          todaySpend,
          weekSpend,
          monthSpend,
          projectedMonthly,
        },
        byModel: stats.byModel,
        byService: stats.byType,
        topUsers,
        hourlyTrend: stats.hourly,
      };
    } catch (error) {
      logger.error('Error getting cost analytics:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const [circuits, cache, database, queue] = await Promise.all([
        this.getCircuitMetrics(),
        this.getCacheMetrics(),
        this.getDatabaseMetrics(),
        this.getQueueMetrics(),
      ]);

      return {
        circuits,
        cache,
        database,
        queue,
      };
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(): Promise<{
    growth: Array<{ date: string; newUsers: number; activeUsers: number }>;
    engagement: {
      dailyActiveUsers: number;
      weeklyActiveUsers: number;
      monthlyActiveUsers: number;
      avgSessionLength: number;
    };
    retention: {
      day1: number;
      day7: number;
      day30: number;
    };
  }> {
    try {
      const [growth, engagement, retention] = await Promise.all([
        this.getUserGrowth(30),
        this.getUserEngagement(),
        this.getUserRetention(),
      ]);

      return {
        growth,
        engagement,
        retention,
      };
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async getUserMetrics() {
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_active', thirtyDaysAgo.toISOString());

    const { count: newUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    return {
      total: totalUsers || 0,
      active: activeUsers || 0,
      new: newUsers || 0,
    };
  }

  private async getAIMetrics() {
    const stats = await this.costTracker.getDashboardStats();
    const cacheStats = await this.aiCache.getStats();

    // Calculate overall cache hit rate
    let totalHits = 0;
    let totalMisses = 0;

    Object.values(cacheStats).forEach((stat) => {
      totalHits += stat.hits;
      totalMisses += stat.misses;
    });

    const cacheHitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

    return {
      requestsToday: stats.today.requests,
      costToday: stats.today.cost,
      cacheHitRate,
      avgResponseTime: await this.getAvgResponseTime(),
    };
  }

  private async getStorageMetrics() {
    const { data: files } = await supabase.from('files').select('size, processed');

    const totalFiles = files?.length || 0;
    const totalSize = files?.reduce((sum, file) => sum + (file.size || 0), 0) || 0;
    const processedFiles = files?.filter((f) => f.processed).length || 0;

    return {
      totalFiles,
      totalSize: this.formatBytes(totalSize),
      processedFiles,
    };
  }

  private async getBasicPerformanceMetrics() {
    const uptime = process.uptime();
    const errorRate = await this.getErrorRate();
    const avgApiLatency = await this.getAvgApiLatency();

    return {
      uptime,
      errorRate,
      avgApiLatency,
    };
  }

  private async getCircuitMetrics() {
    const openAIStats = openAICircuitBreaker.getStats();
    const embeddingStats = embeddingCircuitBreaker.getStats();

    return {
      openAI: {
        state: openAIStats.state,
        failureRate: openAIStats.failureRate,
        lastFailure: openAIStats.lastFailureTime,
      },
      embeddings: {
        state: embeddingStats.state,
        failureRate: embeddingStats.failureRate,
        lastFailure: embeddingStats.lastFailureTime,
      },
    };
  }

  private async getCacheMetrics() {
    const cacheStats = await this.aiCache.getStats();
    const detailedMetrics = await this.aiCache.getDetailedMetrics();

    // Calculate overall hit rate
    let totalHits = 0;
    let totalMisses = 0;

    Object.values(cacheStats).forEach((stat) => {
      totalHits += stat.hits;
      totalMisses += stat.misses;
    });

    const hitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

    return {
      hitRate,
      totalKeys: detailedMetrics.totalKeys,
      memoryUsage: detailedMetrics.memoryUsage,
      costSavings: detailedMetrics.costSavings,
    };
  }

  private async getDatabaseMetrics() {
    // This is a simplified version - in production, you'd want to
    // connect to Postgres directly for detailed metrics
    return {
      activeConnections: 0, // Would query pg_stat_activity
      avgQueryTime: 0, // Would analyze query logs
      slowQueries: [], // Would track slow queries
    };
  }

  private async getQueueMetrics() {
    // Simplified - would integrate with actual queue system
    return {
      pending: 0,
      processing: 0,
      failed: 0,
      avgProcessingTime: 0,
    };
  }

  private async getWeekSpend(): Promise<number> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data } = await supabase
      .from('ai_requests')
      .select('cost')
      .gte('created_at', weekAgo.toISOString());

    return data?.reduce((sum, req) => sum + (req.cost || 0), 0) || 0;
  }

  private async getMonthSpend(): Promise<number> {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const { data } = await supabase
      .from('ai_requests')
      .select('cost')
      .gte('created_at', monthAgo.toISOString());

    return data?.reduce((sum, req) => sum + (req.cost || 0), 0) || 0;
  }

  private projectMonthlySpend(dailySpend: number): number {
    // Simple projection based on current daily spend
    return dailySpend * 30;
  }

  private async getTopUsersBySpend(limit: number) {
    const { data } = await supabase
      .from('ai_requests')
      .select('user_id, cost')
      .order('cost', { ascending: false })
      .limit(limit);

    // Group by user and get details
    const userSpends = new Map<string, { cost: number; count: number }>();

    data?.forEach((req) => {
      const current = userSpends.get(req.user_id) || { cost: 0, count: 0 };
      current.cost += req.cost || 0;
      current.count += 1;
      userSpends.set(req.user_id, current);
    });

    // Get user details
    const userIds = Array.from(userSpends.keys());
    const { data: users } = await supabase.from('users').select('id, email').in('id', userIds);

    const userMap = new Map(users?.map((u) => [u.id, u.email]) || []);

    return Array.from(userSpends.entries())
      .map(([userId, stats]) => ({
        userId,
        email: userMap.get(userId) || 'Unknown',
        totalSpend: stats.cost,
        requestCount: stats.count,
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, limit);
  }

  private async getUserGrowth(days: number) {
    const growth = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Simplified - would use proper analytics
      growth.push({
        date: dateStr,
        newUsers: Math.floor(Math.random() * 10) + 1,
        activeUsers: Math.floor(Math.random() * 100) + 50,
      });
    }

    return growth;
  }

  private async getUserEngagement() {
    // Simplified metrics
    return {
      dailyActiveUsers: 150,
      weeklyActiveUsers: 500,
      monthlyActiveUsers: 1200,
      avgSessionLength: 25, // minutes
    };
  }

  private async getUserRetention() {
    // Simplified retention metrics
    return {
      day1: 0.75,
      day7: 0.45,
      day30: 0.25,
    };
  }

  private async getAvgResponseTime(): Promise<number> {
    // Would calculate from actual response logs
    return 850; // ms
  }

  private async getErrorRate(): Promise<number> {
    // Would calculate from error logs
    return 0.02; // 2%
  }

  private async getAvgApiLatency(): Promise<number> {
    // Would calculate from API logs
    return 120; // ms
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

// Export singleton
export const adminDashboardService = new AdminDashboardService();
