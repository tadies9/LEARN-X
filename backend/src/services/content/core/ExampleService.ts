import { openAIService } from '../../openai/OpenAIService';
import { EnhancedAICache } from '../../cache/EnhancedAICache';
import { CostTracker } from '../../ai/CostTracker';
import { logger } from '../../../utils/logger';
import { UserPersona } from '../../../types/persona';

/**
 * Example Service
 * Handles personalized examples and contextual examples
 */
export class ExampleService {
  constructor(
    private cache: EnhancedAICache,
    private costTracker: CostTracker
  ) {
    // Services initialized for future caching and cost tracking
    void this.cache;
    void this.costTracker;
  }

  /**
   * Generate personalized examples for concepts
   */
  async generatePersonalizedExamples(
    concept: string,
    persona: UserPersona,
    count: number = 3
  ): Promise<string[]> {
    try {
      const interests = [
        ...(persona.primaryInterests || []),
        ...(persona.secondaryInterests || []),
      ];

      let prompt = `Generate ${count} examples for "${concept}".\n\n`;
      if (interests.length > 0) {
        prompt += `Student's interests: ${interests.join(', ')}\n\n`;
        prompt += `Use examples from their interests when naturally relevant.`;
      }

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      });

      const content = response.choices[0].message.content || '';
      return content
        .split('\n\n')
        .filter((ex) => ex.trim().length > 20)
        .slice(0, count);
    } catch (error) {
      logger.error('Failed to generate personalized examples:', error);
      throw error;
    }
  }

  /**
   * Generate contextual examples for different use cases
   */
  async generateContextualExamples(
    concept: string,
    persona: UserPersona,
    exampleType: 'basic' | 'application' | 'problem-solving' | 'real-world' = 'application',
    count: number = 3
  ): Promise<string[]> {
    try {
      const interests = [
        ...(persona.primaryInterests || []),
        ...(persona.secondaryInterests || []),
      ];

      let prompt = `Generate ${count} ${exampleType} examples for "${concept}".\n\n`;
      if (interests.length > 0) {
        prompt += `Student's interests: ${interests.join(', ')}\n\n`;
        prompt += `Use examples from their interests when naturally relevant.`;
      }

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content || '';
      return content
        .split('\n\n')
        .filter((ex) => ex.trim().length > 20)
        .slice(0, count);
    } catch (error) {
      logger.error('Failed to generate contextual examples:', error);
      throw error;
    }
  }
}
