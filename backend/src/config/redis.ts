import Redis from 'ioredis';

// Parse Redis URL if provided, otherwise use individual config
const getRedisConfig = () => {
  // In Docker, REDIS_HOST is set to 'redis' service name
  // In local development, REDIS_HOST is 'localhost'
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379');

  // Only use REDIS_URL if it doesn't point to localhost in Docker
  if (process.env.REDIS_URL && !process.env.REDIS_URL.includes('localhost')) {
    return process.env.REDIS_URL;
  }

  const config = {
    host: redisHost,
    port: redisPort,
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true, // Don't connect immediately
  };

  return config;
};

// Redis configuration
const REDIS_CONFIG = getRedisConfig();

// Create Redis client with error handling
export const redisClient = new Redis(REDIS_CONFIG as any);

redisClient.on('error', (_err) => {
  // Use proper logging service instead of console.error
  // Error handling should be done by the application's logging service
});

redisClient.on('connect', () => {
  // Connection success should be logged by the application's logging service
});

export default redisClient;
