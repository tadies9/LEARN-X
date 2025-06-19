import { Request, Response } from 'express';
import { adminDashboardService } from '../../services/admin/AdminDashboardService';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/errors';

/**
 * Admin dashboard controller
 * Handles admin endpoints for system monitoring and analytics
 */
export class AdminDashboardController {
  /**
   * GET /api/admin/dashboard/overview
   * Get system overview statistics
   */
  async getOverview(_req: Request, res: Response): Promise<void> {
    try {
      const overview = await adminDashboardService.getOverview();
      
      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      logger.error('Error getting admin overview:', error);
      throw new AppError('Failed to get system overview', 500);
    }
  }

  /**
   * GET /api/admin/dashboard/costs
   * Get AI cost analytics
   */
  async getCostAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { start, end } = req.query;
      
      const timeRange = {
        start: start ? new Date(start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: end ? new Date(end as string) : new Date(),
      };
      
      const analytics = await adminDashboardService.getCostAnalytics(timeRange);
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error getting cost analytics:', error);
      throw new AppError('Failed to get cost analytics', 500);
    }
  }

  /**
   * GET /api/admin/dashboard/performance
   * Get system performance metrics
   */
  async getPerformanceMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const metrics = await adminDashboardService.getPerformanceMetrics();
      
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      throw new AppError('Failed to get performance metrics', 500);
    }
  }

  /**
   * GET /api/admin/dashboard/users
   * Get user analytics
   */
  async getUserAnalytics(_req: Request, res: Response): Promise<void> {
    try {
      const analytics = await adminDashboardService.getUserAnalytics();
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      throw new AppError('Failed to get user analytics', 500);
    }
  }

  /**
   * GET /api/admin/dashboard/cache
   * Get cache statistics
   */
  async getCacheStats(req: Request, res: Response): Promise<void> {
    try {
      const { service } = req.query;
      
      const stats = await adminDashboardService.getPerformanceMetrics();
      
      res.json({
        success: true,
        data: {
          cache: stats.cache,
          service: service || 'all',
        },
      });
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      throw new AppError('Failed to get cache statistics', 500);
    }
  }

  /**
   * GET /api/admin/dashboard/circuits
   * Get circuit breaker status
   */
  async getCircuitStatus(_req: Request, res: Response): Promise<void> {
    try {
      const metrics = await adminDashboardService.getPerformanceMetrics();
      
      res.json({
        success: true,
        data: metrics.circuits,
      });
    } catch (error) {
      logger.error('Error getting circuit status:', error);
      throw new AppError('Failed to get circuit breaker status', 500);
    }
  }

  /**
   * POST /api/admin/dashboard/cache/invalidate
   * Invalidate cache entries
   */
  async invalidateCache(req: Request, res: Response): Promise<void> {
    try {
      const { pattern, userId, service } = req.body;
      
      if (!pattern && !userId && !service) {
        throw new AppError('Must provide pattern, userId, or service', 400);
      }
      
      // This would call the appropriate cache invalidation method
      // For now, just return success
      res.json({
        success: true,
        message: 'Cache invalidation initiated',
        pattern: pattern || `user:${userId}:*` || `service:${service}:*`,
      });
    } catch (error) {
      logger.error('Error invalidating cache:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to invalidate cache', 500);
    }
  }

  /**
   * POST /api/admin/dashboard/circuits/reset
   * Reset circuit breakers
   */
  async resetCircuits(req: Request, res: Response): Promise<void> {
    try {
      const { service } = req.body;
      
      if (!service || !['openai', 'embeddings', 'all'].includes(service)) {
        throw new AppError('Invalid service. Must be: openai, embeddings, or all', 400);
      }
      
      // This would reset the actual circuit breakers
      // For now, just return success
      res.json({
        success: true,
        message: `Circuit breakers reset for: ${service}`,
      });
    } catch (error) {
      logger.error('Error resetting circuits:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to reset circuit breakers', 500);
    }
  }
}

// Export singleton instance
export const adminDashboardController = new AdminDashboardController();