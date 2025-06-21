import { Router } from 'express';
import { adminDashboardController } from '../../controllers/admin/AdminDashboardController';
import { authenticateUser } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/adminAuth';
import { asyncHandler } from '../../middleware/asyncHandler';
import { validateRequest } from '../../middleware/validateRequest';
import { z } from 'zod';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateUser);
router.use(requireAdmin);

// Validation schemas
const timeRangeQuerySchema = z.object({
  query: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }),
});

const cacheInvalidateBodySchema = z.object({
  body: z
    .object({
      pattern: z.string().optional(),
      userId: z.string().uuid().optional(),
      service: z.string().optional(),
    })
    .refine((data) => data.pattern || data.userId || data.service, {
      message: 'Must provide pattern, userId, or service',
    }),
});

const circuitResetBodySchema = z.object({
  body: z.object({
    service: z.enum(['openai', 'embeddings', 'all']),
  }),
});

// Routes
router.get(
  '/overview',
  asyncHandler(adminDashboardController.getOverview.bind(adminDashboardController))
);

router.get(
  '/costs',
  validateRequest(timeRangeQuerySchema, 'query'),
  asyncHandler(adminDashboardController.getCostAnalytics.bind(adminDashboardController))
);

router.get(
  '/performance',
  asyncHandler(adminDashboardController.getPerformanceMetrics.bind(adminDashboardController))
);

router.get(
  '/users',
  asyncHandler(adminDashboardController.getUserAnalytics.bind(adminDashboardController))
);

router.get(
  '/cache',
  asyncHandler(adminDashboardController.getCacheStats.bind(adminDashboardController))
);

router.get(
  '/circuits',
  asyncHandler(adminDashboardController.getCircuitStatus.bind(adminDashboardController))
);

router.post(
  '/cache/invalidate',
  validateRequest(cacheInvalidateBodySchema, 'body'),
  asyncHandler(adminDashboardController.invalidateCache.bind(adminDashboardController))
);

router.post(
  '/circuits/reset',
  validateRequest(circuitResetBodySchema, 'body'),
  asyncHandler(adminDashboardController.resetCircuits.bind(adminDashboardController))
);

export default router;
