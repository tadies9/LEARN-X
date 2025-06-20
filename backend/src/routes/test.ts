/**
 * Test routes for development and debugging
 * Following LEARN-X coding standards
 */

import { Router } from 'express';
import * as Sentry from '@sentry/node';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Test Sentry error reporting
 */
router.get('/sentry-error', (_req, res) => {
  logger.info('Testing Sentry error reporting');
  
  // Create a test error
  const testError = new Error('Test error from LEARN-X Backend');
  
  // Add additional context
  Sentry.withScope((scope) => {
    scope.setTag('test', true);
    scope.setLevel('error');
    scope.setContext('test_details', {
      endpoint: '/api/v1/test/sentry-error',
      service: 'backend',
      timestamp: new Date().toISOString()
    });
    
    // Report to Sentry
    Sentry.captureException(testError);
  });
  
  res.json({
    message: 'Test error sent to Sentry',
    service: 'backend',
    timestamp: new Date().toISOString(),
    note: 'Check your Sentry dashboard for the error'
  });
});

/**
 * Test unhandled error (will be caught by error middleware)
 */
router.get('/unhandled-error', () => {
  throw new Error('Unhandled test error from LEARN-X Backend');
});

/**
 * Test async error
 */
router.get('/async-error', async (_req, _res, next) => {
  try {
    await new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error('Async test error from LEARN-X Backend'));
      }, 100);
    });
  } catch (error) {
    next(error);
  }
});

export default router;