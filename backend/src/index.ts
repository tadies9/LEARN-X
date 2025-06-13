import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'express-async-errors';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

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
      ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
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

// API routes
app.use('/api/v1', routes);

// Bull Board dashboard (protected in production)
if (process.env.NODE_ENV === 'development') {
  app.use('/admin/queues', serverAdapter.getRouter());
} else {
  // In production, protect with authentication
  app.use('/admin/queues', (req, res, next) => {
    // Add your admin authentication logic here
    const adminToken = req.headers['x-admin-token'];
    if (adminToken === process.env.ADMIN_TOKEN) {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  }, serverAdapter.getRouter());
}

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
