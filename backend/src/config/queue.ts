import Bull from 'bull';
import Redis from 'ioredis';

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
};

// Create Redis client
export const redis = new Redis(redisConfig);

// Queue options
const defaultQueueOptions = {
  redis: redisConfig,
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
export const fileProcessingQueue = new Bull('file-processing', defaultQueueOptions);
export const embeddingQueue = new Bull('embedding-generation', defaultQueueOptions);
export const notificationQueue = new Bull('notifications', defaultQueueOptions);

// Queue event handlers
fileProcessingQueue.on('failed', (job: Bull.Job, err: Error) => {
  console.error(`File processing job ${job.id} failed:`, err);
});

fileProcessingQueue.on('completed', (job: Bull.Job) => {
  console.log(`File processing job ${job.id} completed`);
});

embeddingQueue.on('failed', (job: Bull.Job, err: Error) => {
  console.error(`Embedding job ${job.id} failed:`, err);
});

notificationQueue.on('failed', (job: Bull.Job, err: Error) => {
  console.error(`Notification job ${job.id} failed:`, err);
});
