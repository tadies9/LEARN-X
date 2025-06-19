/**
 * AI Learn Routes Index
 * Aggregates all AI learning routes with proper organization
 */

import { Router } from 'express';
import outlineRoutes from './outline.routes';
import explainRoutes from './explain.routes';
import feedbackRoutes from './feedback.routes';

const router = Router();

// Mount route modules with appropriate prefixes
router.use('/outline', outlineRoutes);
router.use('/explain', explainRoutes);
router.use('/', feedbackRoutes); // Feedback routes are at root level for backward compatibility

// Health check for the entire AI Learn module
router.get('/health', async (_req, res) => {
  res.json({
    status: 'healthy',
    module: 'ai-learn',
    routes: ['outline', 'explain', 'feedback'],
    timestamp: new Date().toISOString(),
  });
});

export default router;