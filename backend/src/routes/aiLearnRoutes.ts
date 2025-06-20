/**
 * AI Learn Routes - Main Router
 * Migrated to use Python AI service with modular route organization
 * All AI processing now routes through Python FastAPI service
 */

import { Router, Request, Response } from 'express';
import aiLearnModules from './ai-learn';

const router = Router();

// Mount AI Learn modules
router.use('/', aiLearnModules);

// Test endpoint for backward compatibility
router.get('/test', (_req: Request, res: Response) => {
  res.json({ 
    success: true, 
    message: 'AI Learn routes are working!',
    version: '2.0',
    pythonService: true,
    modules: ['outline', 'explain', 'feedback']
  });
});

// Test SSE endpoint (no auth) for backward compatibility
router.get('/test-sse', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendSSE = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendSSE('message', { type: 'test', data: 'SSE is working! (Python AI Ready)' });
  setTimeout(() => {
    sendSSE('message', { type: 'complete' });
    res.end();
  }, 1000);
});

// Legacy route redirects for backward compatibility
// All new functionality is handled by the modular routes

// Redirect /generate-outline to new module (handled by ai-learn/outline routes)
// This endpoint is now fully migrated to Python AI service

// Legacy route: /explain/stream is now handled by ai-learn/explain module
// All streaming functionality migrated to Python AI service

// Legacy routes: All feedback, batch, and stats functionality 
// is now handled by the ai-learn/feedback module with Python AI integration

// Migration info endpoint
router.get('/migration-info', (_req: Request, res: Response) => {
  res.json({
    status: 'migrated',
    message: 'AI Learn routes have been migrated to Python AI service',
    newEndpoints: {
      outline: '/outline/generate-outline',
      explain: '/explain/stream',
      feedback: '/feedback',
      batch: '/batch',
      stats: '/stats/costs',
      health: '/health'
    },
    features: [
      'Python AI service integration',
      'Enhanced caching with personalization',
      'Comprehensive cost tracking',
      'Modular route architecture',
      'Improved streaming responses'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;
