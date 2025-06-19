import { ContentOrchestrator } from './core/ContentOrchestrator';
import { UserPersona } from '../../types/persona';
import { GenerationParams } from '../../types/ai';
import Redis from 'ioredis';

// Re-export types for backward compatibility
export interface DeepExplanationParams extends GenerationParams {
  chunks: Array<{ id: string; content: string; metadata?: any }>;
  topic: string;
  subtopic?: string;
  persona: UserPersona;
}

export interface DeepSummaryParams extends GenerationParams {
  content: string;
  format: 'key-points' | 'comprehensive' | 'visual-map';
  persona: UserPersona;
}

export interface PersonalizedContent {
  content: string;
  personalizationScore: number;
  qualityMetrics: {
    naturalIntegration: number;
    educationalIntegrity: number;
    relevanceEngagement: number;
    flowReadability: number;
  };
  cached: boolean;
}

/**
 * Deep Content Generation Service - Legacy wrapper for ContentOrchestrator
 * @deprecated Use ContentOrchestrator directly for new code
 */
export class DeepContentGenerationService extends ContentOrchestrator {
  constructor(_redis?: Redis) {
    super();
    // Redis parameter ignored for backward compatibility
  }
}

/**
 * Create a new instance of DeepContentGenerationService
 * @deprecated Use ContentOrchestrator directly for new code
 */
export const createDeepContentGenerationService = (_redis: Redis) => {
  return new DeepContentGenerationService(_redis);
};
