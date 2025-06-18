import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';
import { authenticateUser } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRequest } from '../middleware/validateRequest';
import { z } from 'zod';

const router = Router();

// All dashboard routes require authentication
router.use(authenticateUser);

// Validation schemas
const logActivitySchema = z.object({
  body: z.object({
    type: z.enum([
      'course_created',
      'module_completed',
      'file_uploaded',
      'study_session',
      'achievement_earned',
      'quiz_completed',
      'flashcard_practiced',
    ]),
    metadata: z.record(z.any()).optional(),
  }),
});

const getActivitySchema = z.object({
  query: z.object({
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

/**
 * @route   GET /api/v1/dashboard/stats
 * @desc    Get comprehensive dashboard statistics
 * @access  Private
 */
router.get('/stats', asyncHandler(dashboardController.getStats));

/**
 * @route   GET /api/v1/dashboard/activity
 * @desc    Get recent user activity
 * @access  Private
 */
router.get(
  '/activity',
  validateRequest(getActivitySchema, 'query'),
  asyncHandler(dashboardController.getActivity)
);

/**
 * @route   GET /api/v1/dashboard/streak
 * @desc    Get learning streak information
 * @access  Private
 */
router.get('/streak', asyncHandler(dashboardController.getStreak));

/**
 * @route   GET /api/v1/dashboard/recommendations
 * @desc    Get personalized course recommendations
 * @access  Private
 */
router.get('/recommendations', asyncHandler(dashboardController.getRecommendations));

/**
 * @route   POST /api/v1/dashboard/activity
 * @desc    Log a user activity
 * @access  Private
 */
router.post(
  '/activity',
  validateRequest(logActivitySchema),
  asyncHandler(dashboardController.logActivity)
);

/**
 * @route   POST /api/v1/dashboard/streak
 * @desc    Update user's learning streak
 * @access  Private
 */
router.post('/streak', asyncHandler(dashboardController.updateStreak));

export default router;
