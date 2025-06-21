import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class AnalyticsController {
  private analyticsService: AnalyticsService;

  constructor() {
    this.analyticsService = new AnalyticsService();
  }

  trackOnboardingEvent = async (req: Request, res: Response): Promise<Response | void> => {
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

  getOnboardingStats = async (_req: Request, res: Response): Promise<Response | void> => {
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

  getPersonaInsights = async (_req: Request, res: Response): Promise<Response | void> => {
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

  getAggregatedAnalytics = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { userIds, startDate, endDate } = req.query;

      // Parse time range if provided
      let timeRange;
      if (startDate && endDate) {
        timeRange = {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        };
      }

      // Parse user IDs if provided
      const userIdArray = userIds ? (userIds as string).split(',') : undefined;

      const analytics = await this.analyticsService.getAggregatedAnalytics(userIdArray, timeRange);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error getting aggregated analytics:', error);
      throw new AppError('Failed to retrieve aggregated analytics', 500);
    }
  };

  bulkTrackEvents = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { events } = req.body;

      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Events array is required',
        });
      }

      // Add user ID to each event
      const userId = req.user!.id;
      const eventsWithUser = events.map((e) => ({ ...e, userId }));

      await this.analyticsService.bulkInsertEvents(eventsWithUser);

      res.json({
        success: true,
        message: `Successfully tracked ${events.length} events`,
      });
    } catch (error) {
      logger.error('Error bulk tracking events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to track events',
      });
    }
  };
}
