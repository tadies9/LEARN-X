/**
 * API Server Entry Point (No Workers)
 * Dedicated API server without background workers
 * Follows coding standards: Under 100 lines, single responsibility
 */

console.log('🚀 STARTING API SERVER - PRODUCTION VERSION (NO WORKERS)');

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'express-async-errors';

import { initializeSentry } from './config/sentry';
import { apmService } from './config/apm';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { correlationIdMiddleware } from './middleware/correlationId';
import { logger } from './utils/logger';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize monitoring services
initializeSentry(app);
apmService.initialize();

// Sentry middleware will be handled by the integration in sentry config

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add correlation ID middleware early in the chain
app.use(correlationIdMiddleware);

// Morgan with correlation ID
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Rate limiting
app.use('/api', rateLimiter);

// Health check
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'api-server',
    workers: 'external',
  });
});

// Enhanced health check for queue monitoring
app.get('/health/detailed', async (_req, res) => {
  try {
    const { enhancedPGMQClient } = await import('./services/queue/EnhancedPGMQClient');

    const queueMetrics = await enhancedPGMQClient.getAllQueueMetrics();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-server',
      queues: queueMetrics,
      workers: 'external',
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      error: 'Queue metrics unavailable',
      service: 'api-server',
    });
  }
});

// API routes
app.use('/api/v1', routes);

// Sentry error handler will be handled by the integration in sentry config

// Error handling
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`[API Server] Server running on port ${PORT} (workers: external)`);
  logger.info('[API Server] Background workers are running in separate processes');
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`[API Server] Received ${signal}, shutting down gracefully...`);

  // Close server gracefully
  server.close(() => {
    logger.info('[API Server] HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('[API Server] Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
