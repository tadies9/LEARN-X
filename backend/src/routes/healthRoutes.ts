/**
 * Enhanced Health Routes
 * Comprehensive health monitoring for the enhanced PGMQ system
 * Follows coding standards: Under 200 lines, single responsibility
 */

import { Router } from 'express';
import { queueOrchestrator } from '../services/queue/QueueOrchestrator';
import { enhancedPGMQClient } from '../services/queue/EnhancedPGMQClient';
import { ENHANCED_QUEUE_NAMES } from '../config/supabase-queue.config';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Basic health check - fast response for load balancers
 */
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'learn-x-api',
    version: process.env.npm_package_version || '1.0.0',
    node_env: process.env.NODE_ENV || 'development'
  });
});

/**
 * Detailed health check with queue status
 */
router.get('/health/detailed', async (_req, res) => {
  try {
    const startTime = Date.now();
    
    // Get comprehensive system health
    const systemHealth = await queueOrchestrator.getSystemHealth();
    
    // Get detailed metrics
    const detailedMetrics = await queueOrchestrator.getDetailedMetrics();
    
    const responseTime = Date.now() - startTime;
    const statusCode = systemHealth.status === 'healthy' ? 200 : 
                      systemHealth.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      status: systemHealth.status,
      timestamp: systemHealth.timestamp,
      response_time_ms: responseTime,
      service: 'learn-x-api',
      queues: systemHealth.queues,
      metrics: detailedMetrics,
      worker_status: 'external' // Workers run separately
    });

  } catch (error) {
    logger.error('[Health] Failed to get detailed health:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      service: 'learn-x-api'
    });
  }
});

/**
 * Queue-specific health endpoints
 */
router.get('/health/queues', async (_req, res) => {
  try {
    const queueMetrics = await enhancedPGMQClient.getAllQueueMetrics();
    
    const queueHealth = await Promise.all(
      Object.values(ENHANCED_QUEUE_NAMES).map(async (queueName) => {
        const metrics = queueMetrics.find(m => m.queue_name === queueName);
        return {
          name: queueName,
          metrics: metrics || null,
          status: metrics ? 
            (metrics.queue_length > 100 ? 'degraded' : 'healthy') : 
            'unknown'
        };
      })
    );

    res.json({
      timestamp: new Date().toISOString(),
      queues: queueHealth,
      total_queues: queueHealth.length
    });

  } catch (error) {
    logger.error('[Health] Failed to get queue health:', error);
    res.status(500).json({
      error: 'Failed to get queue health',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Individual queue metrics
 */
router.get('/health/queues/:queueName', async (req, res) => {
  try {
    const { queueName } = req.params;
    
    // Validate queue name
    if (!Object.values(ENHANCED_QUEUE_NAMES).includes(queueName as any)) {
      res.status(404).json({
        error: 'Queue not found',
        available_queues: Object.values(ENHANCED_QUEUE_NAMES)
      });
      return;
    }

    const metrics = await enhancedPGMQClient.getQueueMetrics(queueName as any);
    
    if (!metrics) {
      res.status(404).json({
        error: 'Queue metrics not available',
        queue_name: queueName
      });
      return;
    }

    res.json({
      queue_name: queueName,
      metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`[Health] Failed to get metrics for queue ${req.params.queueName}:`, error);
    res.status(500).json({
      error: 'Failed to get queue metrics',
      queue_name: req.params.queueName
    });
  }
});

/**
 * System performance metrics
 */
router.get('/health/performance', async (_req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Get queue performance metrics
    const detailedMetrics = await queueOrchestrator.getDetailedMetrics();
    
    res.json({
      timestamp: new Date().toISOString(),
      system: {
        uptime_seconds: Math.floor(uptime),
        memory: {
          heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external_mb: Math.round(memoryUsage.external / 1024 / 1024),
          rss_mb: Math.round(memoryUsage.rss / 1024 / 1024)
        },
        node_version: process.version,
        platform: process.platform
      },
      queues: detailedMetrics
    });

  } catch (error) {
    logger.error('[Health] Failed to get performance metrics:', error);
    res.status(500).json({
      error: 'Failed to get performance metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Queue management endpoints (development only)
 */
if (process.env.NODE_ENV === 'development') {
  
  /**
   * Emergency purge all queues (development only)
   */
  router.post('/health/queues/purge', async (_req, res) => {
    try {
      logger.warn('[Health] Emergency queue purge requested');
      
      await queueOrchestrator.emergencyPurgeAllQueues();
      
      res.json({
        message: 'All queues purged successfully',
        timestamp: new Date().toISOString(),
        warning: 'This operation is only available in development'
      });

    } catch (error) {
      logger.error('[Health] Failed to purge queues:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to purge queues'
      });
    }
  });

  /**
   * Test queue functionality
   */
  router.post('/health/queues/test', async (_req, res) => {
    try {
      const testFileId = 'test-' + Date.now();
      const testUserId = 'test-user';
      
      logger.info('[Health] Testing queue functionality');
      
      // Test file processing queue
      const msgId = await queueOrchestrator.enqueueFileProcessing(
        testFileId,
        testUserId,
        { priority: 'low', test: true }
      );

      // Test notification queue
      await queueOrchestrator.enqueueNotification(
        testUserId,
        'system_alert',
        'Queue Test',
        'This is a test notification from queue health check',
        { test: true },
        'low'
      );

      res.json({
        message: 'Test jobs enqueued successfully',
        test_file_message_id: msgId,
        timestamp: new Date().toISOString(),
        warning: 'Test jobs may be processed by workers'
      });

    } catch (error) {
      logger.error('[Health] Failed to test queues:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to test queues'
      });
    }
  });
}

export { router as healthRoutes };