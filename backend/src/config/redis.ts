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
  
  console.log(`Redis config: connecting to ${redisHost}:${redisPort}`);
  return config;
};

// Redis configuration
const REDIS_CONFIG = getRedisConfig();

// Create Redis client with error handling
export const redisClient = new Redis(REDIS_CONFIG as any);

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis connected successfully');
});

export default redisClient;