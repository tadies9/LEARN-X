/**
 * Enhanced PGMQ Worker Process
 * Dedicated worker for all PGMQ queues with health monitoring
 * Follows coding standards: Under 100 lines, single responsibility
 */

import 'dotenv/config';
import { FileProcessingQueue } from '../services/queue/FileProcessingQueue';
import { EmbeddingQueue } from '../services/queue/EmbeddingQueue';
import { NotificationQueue } from '../services/queue/NotificationQueue';
import { WorkerHealth } from './shared/WorkerHealth';
import { logger } from '../utils/logger';

/**
 * Main worker class that coordinates all queue processors
 */
class EnhancedPGMQWorker {
  private health: WorkerHealth;
  private fileQueue: FileProcessingQueue;
  private embeddingQueue: EmbeddingQueue;
  private notificationQueue: NotificationQueue;
  private isRunning = false;

  constructor() {
    const workerId = process.env.WORKER_ID || `enhanced-pgmq-${process.pid}`;
    this.health = new WorkerHealth(workerId);
    this.fileQueue = new FileProcessingQueue();
    this.embeddingQueue = new EmbeddingQueue();
    this.notificationQueue = new NotificationQueue();
  }

  /**
   * Starts all queue processors and health monitoring
   */
  async start(): Promise<void> {
    try {
      logger.info('[Enhanced PGMQ Worker] Starting all queue processors...');

      // Check if Python service should handle file processing
      const pythonFileProcessing = process.env.PYTHON_FILE_PROCESSING === 'true';

      if (pythonFileProcessing) {
        logger.info('[Enhanced PGMQ Worker] File processing delegated to Python service');
      }

      this.isRunning = true;

      // Start services based on configuration
      const servicesToStart = [
        this.health.start(),
        this.embeddingQueue.start(),
        this.notificationQueue.start(),
      ];

      // Only start file processing if Python isn't handling it
      if (!pythonFileProcessing) {
        servicesToStart.push(this.fileQueue.start());
      }

      await Promise.all(servicesToStart);

      logger.info('[Enhanced PGMQ Worker] All queue processors started successfully');

      // Setup graceful shutdown handlers
      this.setupShutdownHandlers();
    } catch (error) {
      logger.error('[Enhanced PGMQ Worker] Failed to start:', error);
      await this.stop();
      process.exit(1);
    }
  }

  /**
   * Stops all queue processors gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    logger.info('[Enhanced PGMQ Worker] Graceful shutdown initiated...');
    this.isRunning = false;

    try {
      // Stop all services in parallel with timeout
      await Promise.race([
        Promise.all([
          this.fileQueue.stop(),
          this.embeddingQueue.stop(),
          this.notificationQueue.stop(),
          this.health.stop(),
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Shutdown timeout')), 10000)),
      ]);

      logger.info('[Enhanced PGMQ Worker] Graceful shutdown completed');
    } catch (error) {
      logger.error('[Enhanced PGMQ Worker] Error during shutdown:', error);
    }
  }

  /**
   * Sets up process signal handlers for graceful shutdown
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      logger.info(`[Enhanced PGMQ Worker] Received ${signal}, shutting down...`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('[Enhanced PGMQ Worker] Uncaught exception:', error);
      this.health.recordJobError(error);
      // Don't exit on uncaught exceptions in production
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('[Enhanced PGMQ Worker] Unhandled rejection:', { reason, promise });
      if (reason instanceof Error) {
        this.health.recordJobError(reason);
      }
    });
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const worker = new EnhancedPGMQWorker();

  try {
    await worker.start();

    // Keep the process alive
    process.stdin.resume();
  } catch (error) {
    logger.error('[Enhanced PGMQ Worker] Startup failed:', error);
    process.exit(1);
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  main().catch((error) => {
    logger.error('[Enhanced PGMQ Worker] Fatal error:', error);
    process.exit(1);
  });
}
