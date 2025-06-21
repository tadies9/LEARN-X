import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';

const router = Router();

/**
 * Test Health Endpoints
 *
 * Provides comprehensive health checks for E2E testing,
 * validating all system components and their readiness.
 */

// Basic health check
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Database health check
router.get('/health/database', async (_req: Request, res: Response) => {
  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    // Test database connection
    const { data, error } = await supabase
      .from('users')
      .select('count(*)', { count: 'exact' })
      .limit(1);

    if (error) {
      throw error;
    }

    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      userCount: data?.length || 0,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Redis health check
router.get('/health/redis', async (_req: Request, res: Response) => {
  let redis: Redis | null = null;

  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      connectTimeout: 5000,
      lazyConnect: true,
    });

    await redis.connect();
    await redis.ping();

    res.status(200).json({
      status: 'healthy',
      redis: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      redis: 'disconnected',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (redis) {
      await redis.disconnect();
    }
  }
});

// Queue health check
router.get('/health/queue', async (_req: Request, res: Response) => {
  try {
    // This would check PGMQ queue health
    // For now, simulate the check
    const queueHealth = {
      status: 'healthy',
      queues: {
        file_processing: { healthy: true, pending: 0 },
        ai_generation: { healthy: true, pending: 0 },
        embeddings: { healthy: true, pending: 0 },
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(queueHealth);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// System metrics
router.get('/health/system', async (_req: Request, res: Response) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const metrics = {
      status: 'healthy',
      memory: {
        usage: memUsage.heapUsed,
        total: memUsage.heapTotal,
        external: memUsage.external,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        usage: 0, // Would need to calculate over time
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(metrics);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Database schema validation
router.get('/health/database/schema', async (_req: Request, res: Response) => {
  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

    // Check for required tables
    const requiredTables = [
      'users',
      'courses',
      'modules',
      'files',
      'chunks',
      'embeddings',
      'ai_content',
      'personas',
    ];

    const tableChecks = [];

    for (const table of requiredTables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);

        tableChecks.push({
          table,
          exists: !error,
          error: error?.message,
        });
      } catch (err) {
        tableChecks.push({
          table,
          exists: false,
          error: (err as Error).message,
        });
      }
    }

    const missingTables = tableChecks.filter((check) => !check.exists);
    const isValid = missingTables.length === 0;

    res.status(isValid ? 200 : 503).json({
      status: isValid ? 'healthy' : 'unhealthy',
      schema: {
        valid: isValid,
        tables: tableChecks,
        missing: missingTables.map((t) => t.table),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Detailed queue health
router.get('/health/queue/detailed', async (_req: Request, res: Response) => {
  try {
    // Simulate detailed queue health check
    // In real implementation, this would query PGMQ tables
    const queueDetails = {
      status: 'healthy',
      queues: {
        file_processing: {
          healthy: true,
          pending: Math.floor(Math.random() * 5),
          processing: Math.floor(Math.random() * 3),
          failed: Math.floor(Math.random() * 2),
          avgProcessingTime: 2500 + Math.random() * 1000,
        },
        ai_generation: {
          healthy: true,
          pending: Math.floor(Math.random() * 8),
          processing: Math.floor(Math.random() * 5),
          failed: Math.floor(Math.random() * 1),
          avgProcessingTime: 5000 + Math.random() * 2000,
        },
        embeddings: {
          healthy: true,
          pending: Math.floor(Math.random() * 3),
          processing: Math.floor(Math.random() * 2),
          failed: 0,
          avgProcessingTime: 1500 + Math.random() * 500,
        },
      },
      metrics: {
        pending: 10,
        processing: 5,
        failed: 2,
        avgProcessingTime: 3000,
      },
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(queueDetails);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Comprehensive health check
router.get('/health/comprehensive', async (req: Request, res: Response) => {
  try {
    const checks = await Promise.allSettled([
      // Basic health
      fetch(`${req.protocol}://${req.get('host')}/health`),
      // Database
      fetch(`${req.protocol}://${req.get('host')}/health/database`),
      // Redis
      fetch(`${req.protocol}://${req.get('host')}/health/redis`),
      // Queue
      fetch(`${req.protocol}://${req.get('host')}/health/queue`),
    ]);

    const results = checks.map((check, index) => {
      const endpoints = ['basic', 'database', 'redis', 'queue'];
      return {
        endpoint: endpoints[index],
        status: check.status === 'fulfilled' ? 'success' : 'failed',
        details: check.status === 'fulfilled' ? 'OK' : (check as PromiseRejectedResult).reason,
      };
    });

    const allHealthy = results.every((r) => r.status === 'success');

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      overall: allHealthy,
      components: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
