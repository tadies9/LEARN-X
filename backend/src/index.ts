console.log('🚀 STARTING BACKEND SERVER - DEBUG VERSION');

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'express-async-errors';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { supabase } from './config/supabase';

import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';
import routes from './routes';
import { FILE_PROCESSING_QUEUE, EMBEDDING_QUEUE, NOTIFICATION_QUEUE } from './config/queue';

const app = express();
const PORT = process.env.PORT || 8080;

// Bull Board setup
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullAdapter(FILE_PROCESSING_QUEUE),
    new BullAdapter(EMBEDDING_QUEUE),
    new BullAdapter(NOTIFICATION_QUEUE),
  ],
  serverAdapter: serverAdapter,
});

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

  console.log('Debug endpoints registered');
} else {
  console.log('Not in development mode, skipping debug endpoints');
}

// API routes
app.use('/api/v1', routes);

// Bull Board dashboard (protected in production)
if (process.env.NODE_ENV === 'development') {
  app.use('/admin/queues', serverAdapter.getRouter());
} else {
  // In production, protect with authentication
  app.use(
    '/admin/queues',
    (req, res, next) => {
      // Add your admin authentication logic here
      const adminToken = req.headers['x-admin-token'];
      if (adminToken === process.env.ADMIN_TOKEN) {
        next();
      } else {
        res.status(401).json({ error: 'Unauthorized' });
      }
    },
    serverAdapter.getRouter()
  );
}

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
