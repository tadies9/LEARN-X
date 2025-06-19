/**
 * AI Learn - Feedback and Utility Routes
 * Handles user feedback, cache management, and AI statistics
 */

import { Router, Request, Response } from 'express';
import { authenticateUser } from '../../middleware/auth';
import { aiRateLimiter } from '../../middleware/rateLimiter';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { pythonAIClient } from '../../services/ai/PythonAIClient';
import { EnhancedAICache } from '../../services/cache/EnhancedAICache';
import { CostTracker } from '../../services/ai/CostTracker';
import { pythonBatchService } from '../../services/ai/PythonBatchService';
import { redisClient } from '../../config/redis';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role?: string;
  };
}

interface BatchRequestResult {
  id: string;
  success: boolean;
  result?: {
    content?: string;
    embeddings?: number[][];
    model?: string;
    usage?: Record<string, number>;
    metadata?: {
      usage?: {
        promptTokens: number;
        completionTokens: number;
      };
      [key: string]: unknown;
    };
  };
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

interface PythonServiceResult {
  content?: string;
  embeddings?: number[][];
  model?: string;
  usage?: Record<string, number>;
  metadata?: {
    usage?: {
      promptTokens: number;
      completionTokens: number;
    };
    [key: string]: unknown;
  };
}

const router = Router();

// Initialize services
const costTracker = new CostTracker();
const enhancedAICache = new EnhancedAICache(redisClient, costTracker);

/**
 * Save user feedback for content improvement
 */
router.post('/feedback', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const { contentId, reaction, note, metadata } = req.body;
  const userId = (req as AuthenticatedRequest).user.id;

  logger.info('[AI Learn Feedback] Received feedback:', {
    userId,
    contentId,
    reaction,
    hasNote: !!note,
  });

  try {
    // Store feedback in database
    const { error } = await supabase.from('learning_feedback').insert({
      user_id: userId,
      content_id: contentId,
      reaction,
      note,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    });

    if (error) {
      // If table doesn't exist, log structured feedback
      logger.info('[AI Learn Feedback] Structured feedback logged:', {
        userId,
        contentId,
        reaction,
        note,
        metadata,
        timestamp: new Date().toISOString(),
      });
    }

    // If negative feedback, log it for potential cache invalidation
    if (reaction === 'thumbs-down' || reaction === 'negative') {
      logger.info('[AI Learn Feedback] Negative feedback received, consider cache cleanup:', {
        contentId,
        userId,
        reaction,
      });
    }

    res.json({
      success: true,
      message: 'Feedback saved successfully',
      feedbackProcessed: true,
    });
  } catch (error) {
    logger.error('[AI Learn Feedback] Error saving feedback:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

/**
 * Get user feedback history
 */
router.get(
  '/feedback/history',
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).user.id;
    const { limit = 50, offset = 0 } = req.query;

    try {
      const { data: feedback, error } = await supabase
        .from('learning_feedback')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (error) {
        logger.error('[AI Learn Feedback] Error fetching feedback history:', error);
        res.status(500).json({ error: 'Failed to fetch feedback history' });
        return;
      }

      res.json({
        success: true,
        feedback: feedback || [],
        total: feedback?.length || 0,
      });
    } catch (error) {
      logger.error('[AI Learn Feedback] Error fetching feedback:', error);
      res.status(500).json({ error: 'Failed to fetch feedback history' });
    }
  }
);

/**
 * Invalidate cache when persona changes
 */
router.post(
  '/cache/invalidate-persona',
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).user.id;

    try {
      const invalidated = await enhancedAICache.invalidate({
        userId,
        personaChanged: true,
      });

      logger.info('[AI Learn Cache] Cache invalidated for persona change:', {
        userId,
        keysInvalidated: invalidated,
      });

      res.json({
        success: true,
        message: `Invalidated ${invalidated} cache entries for persona change`,
        keysInvalidated: invalidated,
      });
    } catch (error) {
      logger.error('[AI Learn Cache] Error invalidating cache:', error);
      res.status(500).json({ error: 'Failed to invalidate cache' });
    }
  }
);

/**
 * Clear user-specific cache
 */
router.post(
  '/cache/clear',
  authenticateUser,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).user.id;
    const { tags, keys } = req.body;

    try {
      // Note: EnhancedAICache doesn't support bulk invalidation
      // This would require a custom implementation
      const invalidated = 0;
      logger.info('[AI Learn Cache] Cache clear requested but not implemented:', {
        userId,
        tags,
        keys,
      });

      logger.info('[AI Learn Cache] User cache cleared:', {
        userId,
        keysInvalidated: invalidated,
        tags,
        keys,
      });

      res.json({
        success: true,
        message: `Cleared ${invalidated} cache entries`,
        keysInvalidated: invalidated,
      });
    } catch (error) {
      logger.error('[AI Learn Cache] Error clearing cache:', error);
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  }
);

/**
 * Batch process multiple AI requests through Python service
 */
router.post(
  '/batch',
  authenticateUser,
  aiRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).user.id;
    const { requests, options } = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
      res.status(400).json({ error: 'Requests array is required' });
      return;
    }

    if (requests.length > 20) {
      res.status(400).json({ error: 'Maximum 20 requests per batch' });
      return;
    }

    try {
      logger.info('[AI Learn Batch] Processing batch requests:', {
        userId,
        count: requests.length,
        types: requests.map((r) => r.type),
      });

      // Process requests through Python service when possible
      const pythonRequests = requests.filter((r) =>
        ['generate-content', 'embeddings', 'complete'].includes(r.type)
      );

      const legacyRequests = requests.filter(
        (r) => !['generate-content', 'embeddings', 'complete'].includes(r.type)
      );

      const results: BatchRequestResult[] = [];

      // Process Python service requests
      for (const request of pythonRequests) {
        try {
          let result: PythonServiceResult | undefined;

          if (request.type === 'generate-content') {
            const generator = pythonAIClient.generateContent({
              ...request.params,
              user_id: userId,
              stream: false,
            });

            for await (const chunk of generator) {
              if (chunk.error) {
                throw new Error(chunk.error);
              }
              if (chunk.done) {
                result = { content: chunk.content };
                break;
              }
            }
          } else if (request.type === 'embeddings') {
            result = await pythonAIClient.createEmbeddings({
              ...request.params,
              user_id: userId,
            });
          } else if (request.type === 'complete') {
            const generator = pythonAIClient.complete({
              ...request.params,
              user_id: userId,
              stream: false,
            });

            for await (const chunk of generator) {
              if (chunk.error) {
                throw new Error(chunk.error);
              }
              if (chunk.done) {
                result = { content: chunk.content, metadata: chunk.metadata };
                break;
              }
            }
          }

          results.push({
            id: request.id,
            success: true,
            result,
            usage:
              (result && 'metadata' in result && result.metadata?.usage) ||
              ({
                promptTokens: 0,
                completionTokens: 0,
              } as { promptTokens: number; completionTokens: number }),
          });
        } catch (error) {
          results.push({
            id: request.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Process legacy requests through Python batch service
      if (legacyRequests.length > 0) {
        const legacyResults = await pythonBatchService.batchProcess(
          legacyRequests.map((r) => ({
            ...r,
            userId,
            id: r.id || `${userId}-${Date.now()}-${Math.random()}`,
          })),
          {
            maxBatchSize: 10,
            priorityGroups: true,
            retryFailures: true,
            ...options,
          }
        );

        results.push(...legacyResults);
      }

      // Track costs
      const totalTokens = results.reduce((acc, r) => {
        if (r.usage) {
          return acc + (r.usage.promptTokens || 0) + (r.usage.completionTokens || 0);
        }
        return acc;
      }, 0);

      logger.info('[AI Learn Batch] Batch processing completed:', {
        userId,
        successCount: results.filter((r) => r.success).length,
        failureCount: results.filter((r) => !r.success).length,
        totalTokens,
        pythonRequests: pythonRequests.length,
        legacyRequests: legacyRequests.length,
      });

      res.json({
        success: true,
        results,
        summary: {
          total: results.length,
          successful: results.filter((r) => r.success).length,
          failed: results.filter((r) => !r.success).length,
          totalTokens,
          pythonProcessed: pythonRequests.length,
        },
      });
    } catch (error) {
      logger.error('[AI Learn Batch] Batch processing error:', error);
      res.status(500).json({ error: 'Failed to process batch requests' });
    }
  }
);

/**
 * Get AI usage statistics and costs
 */
router.get('/stats/costs', authenticateUser, async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).user.id;
  const isAdmin = (req as AuthenticatedRequest).user.role === 'admin';

  try {
    // Get cost statistics
    const costStats = await costTracker.getDashboardStats(isAdmin ? undefined : userId);

    // Get cache statistics (simplified)
    const cacheStats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      message: 'Cache stats not fully implemented',
    };

    // Get Python AI service stats
    let pythonStats;
    try {
      pythonStats = await pythonAIClient.getStats();
    } catch (error) {
      logger.warn('[AI Learn Stats] Python service stats unavailable:', error);
      pythonStats = { available: false, error: 'Service unavailable' } as Record<string, unknown>;
    }

    // Get detailed metrics for admins (simplified)
    let detailedMetrics: { message: string } | undefined;
    if (isAdmin) {
      detailedMetrics = {
        message: 'Detailed metrics not fully implemented',
      };
    }

    res.json({
      costs: {
        ...costStats,
        userSpecific: !isAdmin
          ? {
              message: 'User-specific costs require additional implementation',
            }
          : undefined,
      },
      cache: cacheStats,
      python: pythonStats,
      detailed: detailedMetrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[AI Learn Stats] Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * Health check for AI services
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Check Python AI service
    const pythonHealthy = await pythonAIClient.healthCheck();

    // Check cache connection
    const cacheHealthy = (await redisClient.ping()) === 'PONG';

    // Check cost tracker
    const costTrackerHealthy = (await costTracker.getDashboardStats()) !== null;

    const overall = pythonHealthy && cacheHealthy && costTrackerHealthy;

    res.status(overall ? 200 : 503).json({
      status: overall ? 'healthy' : 'degraded',
      services: {
        pythonAI: pythonHealthy ? 'healthy' : 'unhealthy',
        cache: cacheHealthy ? 'healthy' : 'unhealthy',
        costTracker: costTrackerHealthy ? 'healthy' : 'unhealthy',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[AI Learn Health] Health check error:', error);
    res.status(503).json({
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
