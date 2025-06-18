import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'express-async-errors';
import { supabase } from './config/supabase';

import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';
import routes from './routes';

// Server startup - use logger for production compatibility
logger.info('🚀 Starting LEARN-X Backend Server');
const app = express();
const PORT = process.env.PORT || 8080;

// Note: Workers are now started separately via enhanced-pgmq-worker.ts
// This follows the separation of concerns principle for better reliability

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://www.learn-x.co',
      'https://learn-x.co',
      ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []),
      ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Rate limiting
app.use('/api', rateLimiter);

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Development-only debug routes - SECURITY: These endpoints must never be accessible in production
// They contain hardcoded user IDs and bypass authentication for development testing only
if (process.env.NODE_ENV === 'development') {
  logger.info('Setting up development-only debug endpoints');

  // Debug file ownership endpoint - bypasses authentication for development testing
  app.get('/debug/file-owner/:fileId', async (req, res) => {
    try {
      const { fileId } = req.params;
      logger.debug('=== CHECKING FILE OWNERSHIP ===');

      const { data: file, error } = await supabase
        .from('course_files')
        .select(
          `
          *,
          modules!inner(
            id,
            courses!inner(
              id,
              user_id
            )
          )
        `
        )
        .eq('id', fileId)
        .single();

      if (error || !file) {
        logger.debug('❌ File not found:', error);
        return res.json({ error: 'File not found', details: error });
      }

      const ownerUserId = (file as any).modules.courses.user_id;
      logger.debug('✅ File found');
      logger.debug('📄 File details:', {
        id: file.id,
        filename: file.filename,
        storage_path: file.storage_path,
        owner_user_id: ownerUserId,
      });

      return res.json({
        fileId,
        filename: file.filename,
        storage_path: file.storage_path,
        owner_user_id: ownerUserId,
        hardcoded_test_user: 'b2ce911b-ae6a-46b5-9eaa-53cc3696a14a',
        user_match: ownerUserId === 'b2ce911b-ae6a-46b5-9eaa-53cc3696a14a',
      });
    } catch (error) {
      logger.error('Error checking file ownership:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Debug storage endpoint - development testing only
  app.get('/debug/storage/:fileId', async (req, res) => {
    try {
      const { fileId } = req.params;
      logger.debug('Debug request for file:', fileId);

      const { debugFileStorage } = await import('./utils/storageDebug');
      await debugFileStorage(fileId);

      return res.json({ message: 'Debug information logged to console', fileId });
    } catch (error) {
      logger.error('Debug error:', error);
      return res.status(500).json({ error: 'Debug failed' });
    }
  });

  // Debug storage list endpoint - development testing only
  app.get('/debug/storage-list', async (_req, res) => {
    try {
      const { listAllFilesInBucket } = await import('./utils/storageDebug');

      logger.debug('Listing all files in bucket...');
      await listAllFilesInBucket();

      return res.json({ message: 'Bucket contents logged to console' });
    } catch (error) {
      logger.error('Storage list endpoint error:', error);
      return res.status(500).json({ error: 'Storage list failed' });
    }
  });

  // Debug search endpoint - bypasses authentication for development testing only
  app.post('/debug/search', async (req, res) => {
    try {
      const { HybridSearchService } = await import('./services/search/HybridSearchService');
      const searchService = new HybridSearchService();
      const userId = 'b2ce911b-ae6a-46b5-9eaa-53cc3696a14a'; // Hardcoded test user - development only

      const { query, filters = {}, options = {} } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Query parameter is required',
        });
      }

      logger.debug(`Debug search for: "${query}"`);

      const results = await searchService.search(query, userId, {
        filters,
        ...options,
      });

      return res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error('Debug search error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      });
    }
  });

  // Debug search filters endpoint - development testing only
  app.get('/debug/search-filters', async (_req, res) => {
    try {
      const { supabase } = await import('./config/supabase');
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

      return res.json({
        success: true,
        data: {
          courses: courses.data || [],
          fileTypes: fileTypes.data?.map((ft: any) => ft.mime_type) || [],
          contentTypes: contentTypes.data || [],
          importance: [
            { value: 'high', label: 'High Importance' },
            { value: 'medium', label: 'Medium Importance' },
            { value: 'low', label: 'Low Importance' },
          ],
        },
      });
    } catch (error) {
      logger.error('Debug filters error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get filters',
      });
    }
  });

  logger.info('Development debug endpoints registered');
} else {
  logger.info('Production mode: Debug endpoints disabled for security');
}

// API routes
app.use('/api/v1', routes);

// PGMQ Admin routes could be added here in the future if needed

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
