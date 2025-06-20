import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticateUser } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { vectorDashboard } from '../services/vector/monitoring/VectorMonitoringDashboard';
import { vectorSearchCache } from '../services/vector/optimization/VectorSearchCache';
import { createOptimizedVectorService } from '../services/vector/optimization/VectorOptimizationOrchestrator';
import { pythonEmbeddingService } from '../services/embeddings/PythonEmbeddingService';
import { runDefaultBenchmarks } from '../services/vector/benchmarks/VectorBenchmark';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = Router();

// Initialize services
const optimizedVectorService = createOptimizedVectorService(pythonEmbeddingService, {
  enableCaching: true,
  enableHybridSearch: true,
  enableMonitoring: true,
  enableQuantization: false, // Disabled by default
});

/**
 * GET /api/vector-optimization/dashboard
 * Get comprehensive vector search dashboard metrics
 */
router.get('/dashboard', authenticateUser, asyncHandler(async (_req, res) => {
  try {
    const metrics = await vectorDashboard.getDashboardMetrics();
    
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('[VectorOptimization] Dashboard metrics failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard metrics',
    });
  }
}));

/**
 * GET /api/vector-optimization/real-time-metrics
 * Get real-time performance metrics
 */
// Define validation schema
const realTimeMetricsSchema = z.object({
  query: z.object({
    interval: z.string().optional().transform(val => {
      const num = parseInt(val || '5');
      if (isNaN(num) || num < 1 || num > 60) return 5;
      return num;
    }),
  }),
});

router.get('/real-time-metrics', 
  authenticateUser,
  validateRequest(realTimeMetricsSchema, 'query'),
  asyncHandler(async (req, res) => {
    try {
      const interval = (req.query as any).interval || 5;
      const metrics = await vectorDashboard.getRealTimeMetrics(interval);
      
      res.json({
        success: true,
        data: {
          interval,
          metrics,
        },
      });
    } catch (error) {
      logger.error('[VectorOptimization] Real-time metrics failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get real-time metrics',
      });
    }
  })
);

/**
 * GET /api/vector-optimization/alerts
 * Get active performance alerts
 */
router.get('/alerts', authenticateUser, asyncHandler(async (_req, res) => {
  try {
    const alerts = await vectorDashboard.getActiveAlerts();
    
    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error('[VectorOptimization] Get alerts failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts',
    });
  }
}));

/**
 * POST /api/vector-optimization/alerts/:alertId/resolve
 * Resolve a performance alert
 */
router.post('/alerts/:alertId/resolve', authenticateUser, asyncHandler(async (req, res) => {
  try {
    const { alertId } = req.params;
    vectorDashboard.resolveAlert(alertId);
    
    res.json({
      success: true,
      message: 'Alert resolved successfully',
    });
  } catch (error) {
    logger.error('[VectorOptimization] Resolve alert failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
    });
  }
}));

/**
 * GET /api/vector-optimization/performance-comparison
 * Get performance comparison between time periods
 */
// Performance comparison schema
const performanceComparisonSchema = z.object({
  query: z.object({
    current: z.string().optional().transform(val => {
      const num = parseInt(val || '60');
      return isNaN(num) || num < 1 ? 60 : num;
    }),
    previous: z.string().optional().transform(val => {
      const num = parseInt(val || '60');
      return isNaN(num) || num < 1 ? 60 : num;
    }),
  }),
});

router.get('/performance-comparison',
  authenticateUser,
  validateRequest(performanceComparisonSchema, 'query'),
  asyncHandler(async (req, res) => {
    try {
      const currentWindow = (req.query as any).current || 60;
      const previousWindow = (req.query as any).previous || 60;
      
      const comparison = await vectorDashboard.getPerformanceComparison(
        currentWindow,
        previousWindow
      );
      
      res.json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      logger.error('[VectorOptimization] Performance comparison failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get performance comparison',
      });
    }
  })
);

/**
 * POST /api/vector-optimization/search
 * Perform optimized vector search
 */
// Search schema
const searchSchema = z.object({
  body: z.object({
    query: z.string().min(1),
    topK: z.number().int().min(1).max(100).optional().default(10),
    threshold: z.number().min(0).max(1).optional().default(0.7),
    forceBypassCache: z.boolean().optional().default(false),
  }),
});

router.post('/search',
  authenticateUser,
  validateRequest(searchSchema, 'body'),
  asyncHandler(async (req, res) => {
    try {
      const { query, topK = 10, threshold = 0.7, forceBypassCache = false } = req.body;
      
      const result = await optimizedVectorService.optimizedSearch(
        query,
        { topK, threshold },
        forceBypassCache
      );
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('[VectorOptimization] Optimized search failed:', error);
      res.status(500).json({
        success: false,
        error: 'Optimized search failed',
      });
    }
  })
);

/**
 * GET /api/vector-optimization/cache/stats
 * Get detailed cache statistics
 */
router.get('/cache/stats', authenticateUser, asyncHandler(async (_req, res) => {
  try {
    const stats = await vectorSearchCache.getDetailedStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('[VectorOptimization] Cache stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics',
    });
  }
}));

/**
 * POST /api/vector-optimization/cache/clear
 * Clear vector search cache
 */
// Cache clear schema
const cacheClearSchema = z.object({
  body: z.object({
    pattern: z.string().optional(),
  }),
});

router.post('/cache/clear',
  authenticateUser,
  validateRequest(cacheClearSchema, 'body'),
  asyncHandler(async (req, res) => {
    try {
      const { pattern } = req.body;
      const clearedCount = await vectorSearchCache.clear(pattern);
      
      res.json({
        success: true,
        data: {
          clearedEntries: clearedCount,
        },
        message: `Cleared ${clearedCount} cache entries`,
      });
    } catch (error) {
      logger.error('[VectorOptimization] Cache clear failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
      });
    }
  })
);

/**
 * POST /api/vector-optimization/cache/invalidate
 * Invalidate cache entries by criteria
 */
// Cache invalidate schema
const cacheInvalidateSchema = z.object({
  body: z.object({
    fileId: z.string().uuid().optional(),
    olderThan: z.string().datetime().optional(),
  }),
});

router.post('/cache/invalidate',
  authenticateUser,
  validateRequest(cacheInvalidateSchema, 'body'),
  asyncHandler(async (req, res) => {
    try {
      const { fileId, olderThan } = req.body;
      
      const invalidationRules: any = {};
      if (fileId) invalidationRules.fileId = fileId;
      if (olderThan) invalidationRules.olderThan = new Date(olderThan);
      
      const invalidatedCount = await vectorSearchCache.invalidate(invalidationRules);
      
      res.json({
        success: true,
        data: {
          invalidatedEntries: invalidatedCount,
        },
        message: `Invalidated ${invalidatedCount} cache entries`,
      });
    } catch (error) {
      logger.error('[VectorOptimization] Cache invalidation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to invalidate cache',
      });
    }
  })
);

/**
 * POST /api/vector-optimization/warmup
 * Warm up caches with popular queries
 */
// Warmup schema
const warmupSchema = z.object({
  body: z.object({
    queries: z.array(z.string().min(1)).min(1),
  }),
});

router.post('/warmup',
  authenticateUser,
  validateRequest(warmupSchema, 'body'),
  asyncHandler(async (req, res) => {
    try {
      const { queries } = req.body;
      
      await optimizedVectorService.warmup(queries);
      
      res.json({
        success: true,
        message: `Cache warmup completed for ${queries.length} queries`,
      });
    } catch (error) {
      logger.error('[VectorOptimization] Warmup failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to warm up cache',
      });
    }
  })
);

/**
 * GET /api/vector-optimization/performance-report
 * Get comprehensive performance report
 */
router.get('/performance-report', authenticateUser, asyncHandler(async (_req, res) => {
  try {
    const report = await optimizedVectorService.getPerformanceReport();
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('[VectorOptimization] Performance report failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report',
    });
  }
}));

/**
 * POST /api/vector-optimization/benchmark
 * Run vector search benchmarks
 */
router.post('/benchmark', authenticateUser, asyncHandler(async (_req, res) => {
  try {
    // Note: This is a long-running operation
    // In production, you'd want to run this as a background job
    res.json({
      success: true,
      message: 'Benchmark started - check logs for progress',
    });

    // Run benchmark in background
    setImmediate(async () => {
      try {
        await runDefaultBenchmarks();
        logger.info('[VectorOptimization] Benchmark completed successfully');
      } catch (error) {
        logger.error('[VectorOptimization] Benchmark failed:', error);
      }
    });
  } catch (error) {
    logger.error('[VectorOptimization] Benchmark start failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start benchmark',
    });
  }
}));

/**
 * PUT /api/vector-optimization/config
 * Update optimization configuration
 */
// Config update schema
const configUpdateSchema = z.object({
  body: z.object({
    enableCaching: z.boolean().optional(),
    enableQuantization: z.boolean().optional(),
    enableHybridSearch: z.boolean().optional(),
    enableMonitoring: z.boolean().optional(),
    cacheConfig: z.object({
      ttlSeconds: z.number().int().min(60).optional(),
    }).optional(),
    hybridConfig: z.object({
      vectorWeight: z.number().min(0).max(1).optional(),
    }).optional(),
  }),
});

router.put('/config',
  authenticateUser,
  validateRequest(configUpdateSchema, 'body'),
  asyncHandler(async (req, res) => {
    try {
      const config = req.body;
      
      optimizedVectorService.updateConfig(config);
      
      res.json({
        success: true,
        message: 'Configuration updated successfully',
      });
    } catch (error) {
      logger.error('[VectorOptimization] Config update failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration',
      });
    }
  })
);

export default router;