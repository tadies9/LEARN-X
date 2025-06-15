console.log('🚀 STARTING BACKEND SERVER - DEBUG VERSION');

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
import { startPGMQWorkers } from './workers/pgmq';

const app = express();
const PORT = process.env.PORT || 8080;

// Start PGMQ Workers
startPGMQWorkers();

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
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Rate limiting
app.use('/api', rateLimiter);

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Debug routes (development only, no auth required)
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Is development?', process.env.NODE_ENV === 'development');

if (process.env.NODE_ENV === 'development') {
  console.log('Setting up debug endpoints...');

  // Test file ownership endpoint
  app.get('/debug/file-owner/:fileId', async (req, res) => {
    try {
      const { fileId } = req.params;
      console.log('=== CHECKING FILE OWNERSHIP ===');

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
        console.log('❌ File not found:', error);
        return res.json({ error: 'File not found', details: error });
      }

      const ownerUserId = (file as any).modules.courses.user_id;
      console.log('✅ File found');
      console.log('📄 File details:', {
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
      console.error('Error checking file ownership:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/debug/storage/:fileId', async (req, res) => {
    try {
      const { fileId } = req.params;
      console.log('Debug request for file:', fileId);

      const { debugFileStorage } = await import('./utils/storageDebug');
      await debugFileStorage(fileId);

      return res.json({ message: 'Debug information logged to console', fileId });
    } catch (error) {
      console.error('Debug error:', error);
      return res.status(500).json({ error: 'Debug failed' });
    }
  });

  app.get('/debug/storage-list', async (_req, res) => {
    try {
      const { listAllFilesInBucket } = await import('./utils/storageDebug');

      console.log('Listing all files in bucket...');
      await listAllFilesInBucket();

      return res.json({ message: 'Bucket contents logged to console' });
    } catch (error) {
      console.error('Storage list endpoint error:', error);
      return res.status(500).json({ error: 'Storage list failed' });
    }
  });

  // Debug search endpoint (bypasses all middleware)
  app.post('/debug/search', async (req, res) => {
    try {
      const { HybridSearchService } = await import('./services/search/HybridSearchService');
      const searchService = new HybridSearchService();
      const userId = 'b2ce911b-ae6a-46b5-9eaa-53cc3696a14a'; // Hardcoded test user

      const { query, filters = {}, options = {} } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Query parameter is required',
        });
      }

      console.log(`Debug search for: "${query}"`);

      const results = await searchService.search(query, userId, {
        filters,
        ...options,
      });

      return res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      console.error('Debug search error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      });
    }
  });

  app.get('/debug/search-filters', async (_req, res) => {
    try {
      const { supabase } = await import('./config/supabase');
      const userId = 'b2ce911b-ae6a-46b5-9eaa-53cc3696a14a'; // Hardcoded test user

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
      console.error('Debug filters error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get filters',
      });
    }
  });

  console.log('Debug endpoints registered');
} else {
  console.log('Not in development mode, skipping debug endpoints');
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
