import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Load test environment variables
dotenvConfig({ path: path.join(__dirname, '../../.env.test') });

export const testConfig = {
  // Database configuration
  database: {
    url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5433/learnx_test',
    poolSize: 5,
    timeout: 30000,
  },

  // Redis configuration
  redis: {
    url: process.env.TEST_REDIS_URL || 'redis://localhost:6380',
    ttl: 60, // Shorter TTL for tests
  },

  // API configuration
  api: {
    baseUrl: process.env.TEST_API_URL || 'http://localhost:8080',
    timeout: 10000,
  },

  // File processing configuration
  fileProcessing: {
    maxFileSize: 10 * 1024 * 1024, // 10MB for tests
    supportedFormats: ['.pdf', '.txt', '.docx'],
    chunkSize: 500, // Smaller chunks for tests
  },

  // AI configuration
  ai: {
    provider: 'openai',
    model: 'gpt-3.5-turbo', // Use cheaper model for tests
    maxTokens: 1000,
    temperature: 0.7,
    mockResponses: true, // Enable mocked AI responses
  },

  // Performance benchmarks
  performance: {
    fileProcessingThreshold: 5000, // 5 seconds
    aiGenerationThreshold: 3000, // 3 seconds
    searchThreshold: 500, // 500ms
    apiResponseThreshold: 200, // 200ms
  },

  // Test data configuration
  testData: {
    sampleFilesPath: path.join(__dirname, '../fixtures/files'),
    mockDataPath: path.join(__dirname, '../fixtures/mock-data'),
  },

  // Queue configuration
  queue: {
    pgmqSchema: 'pgmq_test',
    workerConcurrency: 2,
    pollInterval: 100, // Faster polling for tests
  },

  // Logging configuration
  logging: {
    level: process.env.TEST_LOG_LEVEL || 'error',
    format: 'json',
  },
};

export default testConfig;