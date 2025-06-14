import { logger } from '../utils/logger';

// Import the main PGMQ worker system
import { startPGMQWorkers } from './pgmq';

// Start all PGMQ workers
startPGMQWorkers()
  .then(() => {
    logger.info('All PGMQ workers started successfully');
  })
  .catch((error) => {
    logger.error('Failed to start PGMQ workers:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing workers');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing workers');
  process.exit(0);
});
