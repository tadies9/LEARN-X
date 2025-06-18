import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { HybridSearchService } from '../services/search/HybridSearchService';
import { logger } from '../utils/logger';
import { supabase } from '../config/supabase';

const router = Router();
const searchService = new HybridSearchService();

// Enhanced search endpoint with filtering and caching
router.post('/search', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { query, filters = {}, options = {} } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      });
      return;
    }

    logger.info(`[SearchRoute] User ${userId} searching for: "${query}"`, {
      filters,
      options,
    });

    const searchResponse = await searchService.search(query, userId, {
      ...options,
      filters,
    });

    res.json({
      success: true,
      data: searchResponse,
    });
  } catch (error) {
    logger.error('[SearchRoute] Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
});

// Search within a specific course
router.post('/search/course/:courseId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { courseId } = req.params;
    const { query, options = {} } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      });
      return;
    }

    // Verify user has access to the course
    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('user_id', userId)
      .single();

    if (!course) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this course',
      });
      return;
    }

    const searchResponse = await searchService.search(query, userId, {
      ...options,
      filters: {
        ...options.filters,
        courseId,
      },
    });

    res.json({
      success: true,
      data: searchResponse,
    });
  } catch (error) {
    logger.error('[SearchRoute] Course search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
});

// Search within a specific module
router.post('/search/module/:moduleId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { moduleId } = req.params;
    const { query, options = {} } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      });
      return;
    }

    // Verify user has access to the module
    const { data: module } = await supabase
      .from('modules')
      .select(
        `
        id,
        courses!inner(
          user_id
        )
      `
      )
      .eq('id', moduleId)
      .single();

    interface ModuleWithCourse {
      id: string;
      courses: {
        user_id: string;
      };
    }
    if (!module || (module as unknown as ModuleWithCourse).courses.user_id !== userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied to this module',
      });
      return;
    }

    const searchResponse = await searchService.search(query, userId, {
      ...options,
      filters: {
        ...options.filters,
        moduleId,
      },
    });

    res.json({
      success: true,
      data: searchResponse,
    });
  } catch (error) {
    logger.error('[SearchRoute] Module search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
});

// Advanced search with filters
router.post('/search/advanced', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { query, filters = {}, options = {} } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Query parameter is required',
      });
      return;
    }

    // Advanced search with all options exposed
    const searchResponse = await searchService.search(query, userId, {
      searchType: options.searchType || 'hybrid',
      limit: options.limit || 20,
      offset: options.offset || 0,
      threshold: options.threshold || 0.7,
      weightVector: options.weightVector || 0.7,
      weightKeyword: options.weightKeyword || 0.3,
      includeContent: options.includeContent !== false,
      highlightMatches: options.highlightMatches !== false,
      filters: {
        courseId: filters.courseId,
        moduleId: filters.moduleId,
        fileTypes: filters.fileTypes,
        contentTypes: filters.contentTypes,
        importance: filters.importance,
        dateRange: filters.dateRange,
      },
    });

    res.json({
      success: true,
      data: searchResponse,
    });
  } catch (error) {
    logger.error('[SearchRoute] Advanced search error:', error);
    res.status(500).json({
      success: false,
      error: 'Advanced search failed',
    });
  }
});

// Clear search cache for user
router.delete('/search/cache', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    await searchService.clearCache(userId);

    res.json({
      success: true,
      message: 'Search cache cleared',
    });
  } catch (error) {
    logger.error('[SearchRoute] Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
    });
  }
});

// Get search filters and facets
router.get('/search/filters', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get available filters for the user
    const [courses, fileTypes, contentTypes] = await Promise.all([
      // Get user's courses
      supabase.from('courses').select('id, title').eq('user_id', userId).order('title'),

      // Get distinct file types
      supabase.from('course_files').select('mime_type').eq('courses.user_id', userId),

      // Get available content types
      Promise.resolve({
        data: [
          { value: 'definition', label: 'Definitions' },
          { value: 'example', label: 'Examples' },
          { value: 'explanation', label: 'Explanations' },
          { value: 'theory', label: 'Theory' },
          { value: 'practice', label: 'Practice' },
          { value: 'summary', label: 'Summaries' },
        ],
      }),
    ]);

    res.json({
      success: true,
      data: {
        courses: courses.data || [],
        fileTypes: fileTypes.data?.map((ft: { mime_type: string }) => ft.mime_type) || [],
        contentTypes: contentTypes.data || [],
        importance: [
          { value: 'high', label: 'High Importance' },
          { value: 'medium', label: 'Medium Importance' },
          { value: 'low', label: 'Low Importance' },
        ],
      },
    });
  } catch (error) {
    logger.error('[SearchRoute] Filters error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get filters',
    });
  }
});

// Development-only debug endpoints - SECURITY: These bypass authentication and must never be accessible in production
// They contain hardcoded user IDs and are only for development testing
if (process.env.NODE_ENV === 'development') {
  logger.info('[SearchRoute] Setting up development-only debug endpoints');

  // Debug search endpoint - bypasses authentication for development testing only
  router.post('/debug/search', async (req: Request, res: Response) => {
    try {
      const userId = 'b2ce911b-ae6a-46b5-9eaa-53cc3696a14a'; // Hardcoded test user - development only
      const { query, filters = {}, options = {} } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Query parameter is required',
        });
        return;
      }

      logger.debug(`[SearchRoute] Debug search for: "${query}"`, {
        filters,
        options,
      });

      const results = await searchService.search(query, userId, {
        filters,
        ...options,
      });

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('[SearchRoute] Debug search error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      });
    }
  });

  // Debug filters endpoint - bypasses authentication for development testing only
  router.get('/debug/filters', async (_req: Request, res: Response) => {
    try {
      const userId = 'b2ce911b-ae6a-46b5-9eaa-53cc3696a14a'; // Hardcoded test user - development only

      const [courses, fileTypes, contentTypes] = await Promise.all([
        // Get user's courses
        supabase.from('courses').select('id, title').eq('user_id', userId).order('title'),

        // Get distinct file types
        supabase.from('course_files').select('mime_type').eq('courses.user_id', userId),

        // Get available content types
        Promise.resolve({
          data: [
            { value: 'definition', label: 'Definitions' },
            { value: 'example', label: 'Examples' },
            { value: 'explanation', label: 'Explanations' },
            { value: 'theory', label: 'Theory' },
            { value: 'practice', label: 'Practice' },
            { value: 'summary', label: 'Summaries' },
          ],
        }),
      ]);

      res.json({
        success: true,
        data: {
          courses: courses.data || [],
          fileTypes: fileTypes.data?.map((ft: { mime_type: string }) => ft.mime_type) || [],
          contentTypes: contentTypes.data || [],
          importance: [
            { value: 'high', label: 'High Importance' },
            { value: 'medium', label: 'Medium Importance' },
            { value: 'low', label: 'Low Importance' },
          ],
        },
      });
    } catch (error) {
      logger.error('[SearchRoute] Debug filters error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get filters',
      });
    }
  });

  logger.info('[SearchRoute] Development debug endpoints registered');
} else {
  logger.info('[SearchRoute] Production mode: Debug endpoints disabled for security');
}

export default router;
