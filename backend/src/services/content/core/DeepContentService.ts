import { ContentOrchestrator } from './ContentOrchestrator';
import Redis from 'ioredis';

// Re-export types for backward compatibility
export { DeepExplanationParams, DeepSummaryParams, PersonalizedContent } from './types';

/**
 * Deep Content Service - Legacy wrapper for ContentOrchestrator
 * @deprecated Use ContentOrchestrator directly for new code
 */
export class DeepContentService extends ContentOrchestrator {
  constructor(redis: Redis) {
    super(redis);
  }
}

/**
 * Create a new instance of DeepContentService
 * @deprecated Use ContentOrchestrator directly for new code
 */
export const createDeepContentService = (redis: Redis) => {
  return new DeepContentService(redis);
};
