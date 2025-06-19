import { openAIService } from '../../openai/OpenAIService';
import { deepPersonalizationEngine } from '../../personalization/DeepPersonalizationEngine';
import { EnhancedAICache } from '../../cache/EnhancedAICache';
import { CostTracker } from '../../ai/CostTracker';
import { logger } from '../../../utils/logger';
import { UserPersona } from '../../../types/persona';
import { PersonalizedContent } from './types';

/**
 * Practice Service
 * Handles practice exercises and visual learning aids
 */
export class PracticeService {
  constructor(
    _cache: EnhancedAICache,
    _costTracker: CostTracker
  ) {}

  /**
   * Generate personalized practice exercises
   */
  async generatePersonalizedPractice(
    concept: string,
    persona: UserPersona,
    practiceType: 'guided' | 'independent' | 'challenge' = 'independent'
  ): Promise<PersonalizedContent> {
    try {
      const interests = [
        ...(persona.primaryInterests || []),
        ...(persona.secondaryInterests || []),
      ];

      let prompt = `Create ${practiceType} practice exercises for "${concept}".\n\n`;
      if (interests.length > 0) {
        prompt += `Student's interests: ${interests.join(', ')}\n\n`;
        prompt += `Make exercises relevant to their interests when possible.`;
      }

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 1200,
      });

      const practice = response.choices[0].message.content || '';
      const validation = deepPersonalizationEngine.validatePersonalization(practice, persona);

      return {
        content: practice,
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
      logger.error('Failed to generate personalized practice:', error);
      throw error;
    }
  }

  /**
   * Generate visual learning aid
   */
  async generateVisualLearningAid(
    concept: string,
    persona: UserPersona,
    aidType: 'flowchart' | 'hierarchy' | 'cycle' | 'matrix' | 'timeline' = 'flowchart'
  ): Promise<PersonalizedContent> {
    try {
      const interests = [
        ...(persona.primaryInterests || []),
        ...(persona.secondaryInterests || []),
      ];

      let prompt = `Create a ${aidType} visual aid for "${concept}".\n\n`;
      if (interests.length > 0) {
        prompt += `Student's interests: ${interests.join(', ')}\n\n`;
        prompt += `Use examples from their interests in the visual aid when relevant.`;
      }

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 1000,
      });

      const visualAid = response.choices[0].message.content || '';
      const validation = deepPersonalizationEngine.validatePersonalization(visualAid, persona);

      return {
        content: visualAid,
        personalizationScore: validation.score,
        qualityMetrics: {
          naturalIntegration: 0.8,
          educationalIntegrity: 0.9,
          relevanceEngagement: 0.8,
          flowReadability: 0.9,
        },
        cached: false,
      };
    } catch (error) {
      logger.error('Failed to generate visual learning aid:', error);
      throw error;
    }
  }
}
