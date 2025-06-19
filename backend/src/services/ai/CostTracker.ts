import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { AIRequestType } from '../../types/ai';
import { TokenCounter } from './TokenCounter';

export class CostTracker {
  private dailyBudget: number;
  private userDailyLimit: number;

  constructor() {
    this.dailyBudget = parseFloat(process.env.AI_DAILY_BUDGET_USD || '50');
    this.userDailyLimit = parseFloat(process.env.AI_USER_DAILY_LIMIT_USD || '5');
  }

  async trackRequest(params: {
    userId: string;
    requestType: AIRequestType;
    model: string;
    promptTokens: number;
    completionTokens: number;
    responseTimeMs: number;
    cacheHit?: boolean;
  }): Promise<void> {
    try {
      const cost = TokenCounter.estimateCost(
        params.promptTokens,
        params.completionTokens,
        params.model
      );

      const { error } = await supabase.from('ai_requests').insert({
        user_id: params.userId,
        request_type: params.requestType,
        model: params.model,
        prompt_tokens: params.promptTokens,
        completion_tokens: params.completionTokens,
        cost,
        response_time_ms: params.responseTimeMs,
        cache_hit: params.cacheHit || false,
      });

      if (error) {
        if (error.code === '42P01') {
          logger.warn('AI cost tracking disabled: ai_requests table does not exist');
          return; // Skip further processing if table doesn't exist
        } else {
          logger.error('Failed to track AI request:', error);
        }
      }

      // Check if user is approaching daily limit
      await this.checkUserLimit(params.userId);
    } catch (error) {
      logger.error('Cost tracking error:', error);
    }
  }

  async getUserDailySpend(userId: string): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('ai_requests')
        .select('cost')
        .eq('user_id', userId)
        .gte('created_at', today.toISOString());

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist, return 0 spend
          return 0;
        }
        logger.error('Failed to get user daily spend:', error);
        return 0;
      }

      return data.reduce((sum, request) => sum + (request.cost || 0), 0);
    } catch (error) {
      logger.error('Error calculating user daily spend:', error);
      return 0;
    }
  }

  async getTotalDailySpend(): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('ai_requests')
        .select('cost')
        .gte('created_at', today.toISOString());

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist, return 0 spend
          return 0;
        }
        logger.error('Failed to get total daily spend:', error);
        return 0;
      }

      return data.reduce((sum, request) => sum + (request.cost || 0), 0);
    } catch (error) {
      logger.error('Error calculating total daily spend:', error);
      return 0;
    }
  }

  async checkUserLimit(userId: string): Promise<{
    allowed: boolean;
    dailySpend: number;
    remainingBudget: number;
  }> {
    const dailySpend = await this.getUserDailySpend(userId);
    const remainingBudget = this.userDailyLimit - dailySpend;
    const allowed = remainingBudget > 0;

    if (!allowed) {
      logger.warn(`User ${userId} has exceeded daily AI limit: $${dailySpend}`);
    } else if (remainingBudget < 0.5) {
      logger.warn(`User ${userId} is approaching daily limit: $${remainingBudget} remaining`);
    }

    return { allowed, dailySpend, remainingBudget };
  }

  async checkSystemBudget(): Promise<{
    allowed: boolean;
    totalSpend: number;
    remainingBudget: number;
  }> {
    const totalSpend = await this.getTotalDailySpend();
    const remainingBudget = this.dailyBudget - totalSpend;
    const allowed = remainingBudget > 0;

    if (!allowed) {
      logger.error(`System has exceeded daily AI budget: $${totalSpend}`);
    } else if (remainingBudget < 10) {
      logger.warn(`System is approaching daily budget: $${remainingBudget} remaining`);
    }

    return { allowed, totalSpend, remainingBudget };
  }

  /**
   * Alias for getDashboardStats for backward compatibility
   */
  async getStats(userId?: string): Promise<{
    today: {
      requests: number;
      cost: number;
      tokens: number;
      cacheHitRate: number;
    };
    byModel: Record<string, { requests: number; cost: number }>;
    byType: Record<string, { requests: number; cost: number }>;
    hourly: Array<{ hour: number; requests: number; cost: number }>;
  }> {
    return this.getDashboardStats(userId);
  }

  async getDashboardStats(userId?: string): Promise<{
    today: {
      requests: number;
      cost: number;
      tokens: number;
      cacheHitRate: number;
    };
    byModel: Record<string, { requests: number; cost: number }>;
    byType: Record<string, { requests: number; cost: number }>;
    hourly: Array<{ hour: number; requests: number; cost: number }>;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let query = supabase.from('ai_requests').select('*').gte('created_at', today.toISOString());

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist, return empty stats
          return this.getEmptyStats();
        }
        logger.error('Failed to get dashboard stats:', error);
        throw error;
      }

      // Calculate stats
      const stats = {
        today: {
          requests: data.length,
          cost: data.reduce((sum, r) => sum + (r.cost || 0), 0),
          tokens: data.reduce(
            (sum, r) => sum + (r.prompt_tokens || 0) + (r.completion_tokens || 0),
            0
          ),
          cacheHitRate: data.length > 0 ? data.filter((r) => r.cache_hit).length / data.length : 0,
        },
        byModel: {} as Record<string, { requests: number; cost: number }>,
        byType: {} as Record<string, { requests: number; cost: number }>,
        hourly: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          requests: 0,
          cost: 0,
        })),
      };

      // Group by model and type
      data.forEach((request) => {
        // By model
        if (!stats.byModel[request.model]) {
          stats.byModel[request.model] = { requests: 0, cost: 0 };
        }
        stats.byModel[request.model].requests++;
        stats.byModel[request.model].cost += request.cost || 0;

        // By type
        if (!stats.byType[request.request_type]) {
          stats.byType[request.request_type] = { requests: 0, cost: 0 };
        }
        stats.byType[request.request_type].requests++;
        stats.byType[request.request_type].cost += request.cost || 0;

        // Hourly
        const hour = new Date(request.created_at).getHours();
        stats.hourly[hour].requests++;
        stats.hourly[hour].cost += request.cost || 0;
      });

      return stats;
    } catch (error) {
      logger.error('Failed to generate dashboard stats:', error);
      throw error;
    }
  }

  private getEmptyStats() {
    return {
      today: {
        requests: 0,
        cost: 0,
        tokens: 0,
        cacheHitRate: 0,
      },
      byModel: {},
      byType: {},
      hourly: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        requests: 0,
        cost: 0,
      })),
    };
  }
}
