import { logger } from '../utils/logger';

// Import workers
import './fileProcessingWorker';
import './notificationWorker';
import './embeddingWorker';

logger.info('Workers started successfully');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing workers');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing workers');
  process.exit(0);
});
