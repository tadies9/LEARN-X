import Bull from 'bull';
import Redis from 'ioredis';

// Redis configuration
const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
};

// Create Redis client
export const REDIS = new Redis(REDIS_CONFIG);

// Queue options
const DEFAULT_QUEUE_OPTIONS = {
  redis: REDIS_CONFIG,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
};

// Create queues
export const FILE_PROCESSING_QUEUE = new Bull('file-processing', DEFAULT_QUEUE_OPTIONS);
export const EMBEDDING_QUEUE = new Bull('embedding-generation', DEFAULT_QUEUE_OPTIONS);
export const NOTIFICATION_QUEUE = new Bull('notifications', DEFAULT_QUEUE_OPTIONS);

// Queue event handlers
FILE_PROCESSING_QUEUE.on('failed', (job, err) => {
  console.error(`File processing job ${job.id} failed:`, err);
});

FILE_PROCESSING_QUEUE.on('completed', (job) => {
  console.log(`File processing job ${job.id} completed`);
});

EMBEDDING_QUEUE.on('failed', (job, err) => {
  console.error(`Embedding job ${job.id} failed:`, err);
});

NOTIFICATION_QUEUE.on('failed', (job, err) => {
  console.error(`Notification job ${job.id} failed:`, err);
});
