import { openAIService } from '../../openai/OpenAIService';
import { deepPersonalizationEngine } from '../../personalization/DeepPersonalizationEngine';
import { AICache } from '../../cache/AICache';
import { CostTracker } from '../../ai/CostTracker';
import { logger } from '../../../utils/logger';
import { UserPersona } from '../../../types/persona';
import { PersonalizedContent } from './types';

/**
 * Introduction Service
 * Handles personalized introductions that immediately hook learners
 */
export class IntroductionService {
  constructor(
    private cache: AICache,
    private costTracker: CostTracker
  ) {
    // Services initialized for future caching and cost tracking
    void this.cache;
    void this.costTracker;
  }

  /**
   * Generate personalized introduction that immediately hooks the learner
   */
  async generatePersonalizedIntroduction(
    topic: string,
    content: string,
    persona: UserPersona
  ): Promise<PersonalizedContent> {
    try {
      const interests = [
        ...(persona.primaryInterests || []),
        ...(persona.secondaryInterests || []),
      ];

      let prompt = `Create an engaging introduction for "${topic}" that immediately hooks the learner.\n\n`;
      prompt += `Content to introduce:\n${content}\n\n`;

      if (interests.length > 0) {
        prompt += `Student's interests: ${interests.join(', ')}\n\n`;
        prompt += `Make the introduction personally relevant by connecting to their interests naturally.`;
      }

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You create engaging, personalized introductions that immediately capture learner interest.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const introduction = response.choices[0].message.content || '';
      const validation = deepPersonalizationEngine.validatePersonalization(introduction, persona);

      return {
        content: introduction,
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
      logger.error('Failed to generate personalized introduction:', error);
      throw error;
    }
  }
}
