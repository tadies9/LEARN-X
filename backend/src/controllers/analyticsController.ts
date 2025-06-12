import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  trackOnboardingEvent = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { event, step, timeSpent, metadata } = req.body;

      if (!event) {
        return res.status(400).json({
          success: false,
          message: 'Event type is required',
        });
      }

      await this.analyticsService.trackOnboardingEvent({
        userId,
        event,
        step,
        timeSpent,
        metadata,
      });

      res.json({
        success: true,
        message: 'Event tracked successfully',
      });
    } catch (error) {
      logger.error('Error tracking onboarding event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track event',
      });
    }
  };

  getOnboardingStats = async (req: Request, res: Response) => {
    try {
      // TODO: Add admin check
      const stats = await this.analyticsService.getOnboardingStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting onboarding stats:', error);
      throw new AppError('Failed to retrieve onboarding stats', 500);
    }
  };

  getPersonaInsights = async (req: Request, res: Response) => {
    try {
      // TODO: Add admin check
      const insights = await this.analyticsService.getPersonaInsights();

      res.json({
        success: true,
        data: insights,
      });
    } catch (error) {
      logger.error('Error getting persona insights:', error);
      throw new AppError('Failed to retrieve persona insights', 500);
    }
  };
}