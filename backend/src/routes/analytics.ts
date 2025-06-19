import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import { AnalyticsController } from '../controllers/analyticsController';

const router = Router();
const analyticsController = new AnalyticsController();

// All routes require authentication
router.use(authenticateUser);

// Track onboarding event
router.post('/onboarding', analyticsController.trackOnboardingEvent);

// Get onboarding stats (admin only)
router.get('/onboarding/stats', analyticsController.getOnboardingStats);

// Get persona insights (admin only)
router.get('/persona/insights', analyticsController.getPersonaInsights);

// Get aggregated analytics with direct Postgres
router.get('/aggregated', analyticsController.getAggregatedAnalytics);

// Bulk track events for performance
router.post('/bulk', analyticsController.bulkTrackEvents);

export default router;
