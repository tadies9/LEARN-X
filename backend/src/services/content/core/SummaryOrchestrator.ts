import { openAIService } from '../../openai/OpenAIService';
import { deepPersonalizationEngine } from '../../personalization/DeepPersonalizationEngine';
import { AICache } from '../../cache/AICache';
import { CostTracker } from '../../ai/CostTracker';
import { logger } from '../../../utils/logger';
import { UserPersona } from '../../../types/persona';
import { DeepSummaryParams, PersonalizedContent } from './types';

/**
 * Summary Orchestrator
 * Handles personalized summaries and goal-oriented content
 */
export class SummaryOrchestrator {
  constructor(
    private cache: AICache,
    private costTracker: CostTracker
  ) {
    // Services initialized for future caching and cost tracking
    void this.cache;
    void this.costTracker;
  }

  /**
   * Generate comprehensive personalized summary
   */
  async generateDeepSummary(params: DeepSummaryParams): Promise<PersonalizedContent> {
    try {
      const interests = [
        ...(params.persona.primaryInterests || []),
        ...(params.persona.secondaryInterests || []),
      ];

      let prompt = `Create a ${params.format} summary of:\n\n${params.content}\n\n`;
      if (interests.length > 0) {
        prompt += `Student's interests: ${interests.join(', ')}\n\n`;
        prompt += `Connect to their interests naturally when relevant.`;
      }

      const response = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 1200,
      });

      const summary = response.choices[0].message.content || '';
      const validation = deepPersonalizationEngine.validatePersonalization(summary, params.persona);

      return {
        content: summary,
        personalizationScore: validation.score,
        qualityMetrics: {
          naturalIntegration: 0.8,
          educationalIntegrity: 0.9,
          relevanceEngagement: 0.7,
          flowReadability: 0.8,
        },
        cached: false,
      };
    } catch (error) {
      logger.error('Failed to generate deep summary:', error);
      throw error;
    }
  }

  /**
   * Generate goal-oriented summary
   */
  async generateGoalOrientedSummary(
    content: string,
    persona: UserPersona,
    summaryPurpose: 'review' | 'application' | 'next-steps' | 'connections' = 'review'
  ): Promise<PersonalizedContent> {
    try {
      const interests = [
        ...(persona.primaryInterests || []),
        ...(persona.secondaryInterests || []),
      ];

      let prompt = `Create a ${summaryPurpose}-focused summary of:\n\n${content}\n\n`;
      if (interests.length > 0) {
        prompt += `Student's interests: ${interests.join(', ')}\n\n`;
        prompt += `Focus on ${summaryPurpose} aspects, connecting to their interests naturally.`;
      }

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 1000,
      });

      const summary = response.choices[0].message.content || '';
      const validation = deepPersonalizationEngine.validatePersonalization(summary, persona);

      return {
        content: summary,
        personalizationScore: validation.score,
        qualityMetrics: {
          naturalIntegration: 0.8,
          educationalIntegrity: 0.9,
          relevanceEngagement: 0.8,
          flowReadability: 0.8,
        },
        cached: false,
      };
    } catch (error) {
      logger.error('Failed to generate goal-oriented summary:', error);
      throw error;
    }
  }
}
