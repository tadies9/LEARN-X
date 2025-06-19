import { EnhancedAICache } from '../../cache/EnhancedAICache';
import { CostTracker } from '../../ai/CostTracker';
import { openAIService } from '../../openai/OpenAIService';
import { logger } from '../../../utils/logger';
import { ChatParams } from './types';

/**
 * Chat Orchestrator
 * Handles personalized chat responses and streaming conversations
 */
export class ChatOrchestrator {
  constructor(
    private cache: EnhancedAICache,
    private costTracker: CostTracker
  ) {
    // Services initialized for future caching and cost tracking
    void this.cache;
    void this.costTracker;
  }

  /**
   * Stream personalized chat responses
   */
  async *streamPersonalizedChat(params: ChatParams): AsyncGenerator<string> {
    try {
      const interests = [
        ...(params.persona.primaryInterests || []),
        ...(params.persona.secondaryInterests || []),
      ];

      let prompt = `Student question: ${params.message}\n\n`;
      if (params.context.length > 0) {
        prompt += `Context: ${params.context.join('\n\n')}\n\n`;
      }
      if (interests.length > 0) {
        prompt += `Student's interests: ${interests.join(', ')}\n\n`;
      }
      prompt += `Provide a helpful, personalized response.`;

      const stream = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
        temperature: 0.6,
        max_tokens: 1500,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) yield content;
      }
    } catch (error) {
      logger.error('Failed to stream personalized chat:', error);
      throw error;
    }
  }
}
