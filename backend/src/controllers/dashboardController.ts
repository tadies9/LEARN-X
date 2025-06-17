import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboardService';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

class DashboardController {
  /**
   * Get comprehensive dashboard statistics for a user
   */
  async getStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const stats = await dashboardService.getUserStats(userId);

      res.json({
        status: 'success',
        data: stats,
      });
    } catch (error) {
      logger.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get recent user activity
   */
  async getActivity(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await dashboardService.getRecentActivity(userId, limit);

      res.json({
        status: 'success',
        data: activities,
      });
    } catch (error) {
      logger.error('Error fetching user activity:', error);
      throw error;
    }
  }

  /**
   * Get learning streak information
   */
  async getStreak(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const streak = await dashboardService.getStreakInfo(userId);

      res.json({
        status: 'success',
        data: streak,
      });
    } catch (error) {
      logger.error('Error fetching streak info:', error);
      throw error;
    }
  }

  /**
   * Get personalized recommendations
   */
  async getRecommendations(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const recommendations = await dashboardService.getPersonalizedRecommendations(userId);

      res.json({
        status: 'success',
        data: recommendations,
      });
    } catch (error) {
      logger.error('Error fetching recommendations:', error);
      throw error;
    }
  }

  /**
   * Log a user activity
   */
  async logActivity(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { type, metadata } = req.body;

      if (!type) {
        throw new AppError('Activity type is required', 400);
      }

      const activity = await dashboardService.logActivity({
        userId,
        type,
        metadata,
      });

      res.status(201).json({
        status: 'success',
        data: activity,
      });
    } catch (error) {
      logger.error('Error logging activity:', error);
      throw error;
    }
  }

  /**
   * Update user's learning streak
   */
  async updateStreak(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const updatedStreak = await dashboardService.updateStreak(userId);

      res.json({
        status: 'success',
        data: updatedStreak,
      });
    } catch (error) {
      logger.error('Error updating streak:', error);
      throw error;
    }
  }
}

export const dashboardController = new DashboardController();