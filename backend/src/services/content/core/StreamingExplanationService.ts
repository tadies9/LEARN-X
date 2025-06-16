import { openAIService } from '../../openai/OpenAIService';
import { deepPersonalizationEngine } from '../../personalization/DeepPersonalizationEngine';
import { AICache } from '../../cache/AICache';
import { CostTracker } from '../../ai/CostTracker';
import { logger } from '../../../utils/logger';
import { UserPersona } from '../../../types/persona';
import { DeepExplanationParams, PersonalizedContent } from './types';

/**
 * Streaming Explanation Service
 * Handles streaming explanations and progressive explanations
 */
export class StreamingExplanationService {
  constructor(
    private cache: AICache,
    private costTracker: CostTracker
  ) {
    // Services initialized for future caching and cost tracking
    void this.cache;
    void this.costTracker;
  }

  /**
   * Generate deeply personalized explanation with streaming
   */
  async *generateDeepExplanation(params: DeepExplanationParams): AsyncGenerator<string> {
    try {
      // Reduce context length to ~1500 tokens (~8000 characters) to keep prompt focused
      const rawContent = params.chunks.map((c) => c.content).join('\n\n');
      const content = rawContent.length > 8000 ? rawContent.slice(0, 8000) : rawContent;

      // Use the deep personalization engine to create sophisticated prompts
      const personalizedPrompt = deepPersonalizationEngine.buildDeepPersonalizedPrompt(
        params.persona,
        content,
        'explanation',
        params.topic
      );

      const stream = await openAIService.getClient().chat.completions.create({
        model: params.model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert tutor creating personalized learning content. 
Return ONLY the inner HTML content – do NOT include <html>, <head>, <body> or any wrapper tags.
STRUCTURE RULES (Phase-2):
  • <h2> for the main topic title (one per chunk)
  • <h3> for each key idea/sub-idea
  • No paragraph (>4 sentences). Break long ideas into multiple <p> blocks
  • Use <ul>/<li> whenever listing 3 or more items
  • Leave a blank line between block-level elements (helps readability)
Use semantic HTML tags like <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <div>, etc.
Begin with a short, vivid hook from the learner's world (max 20 words) before you explain any concept.
Start directly with the content (e.g., <h2>Topic Title</h2>).

QUALITY CHECK:
After you finish drafting, silently think for ONE sentence (do NOT output it) whether the personalization feels forced; if so, internally regenerate until seamless.

PERSONALIZATION APPROACH:
- Weave analogies and examples NATURALLY throughout the content
- Choose the most relevant interest/context for each concept
- NEVER announce "Here's an analogy" or use special styling boxes
- Make personalization feel discovered, not forced
- Integrate examples naturally using their professional context
- Adapt complexity to their technical level`,
          },
          { role: 'user', content: personalizedPrompt },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) yield content;
      }
    } catch (error) {
      logger.error('Failed to generate deep explanation:', error);
      throw error;
    }
  }

  /**
   * Generate progressive explanation that builds complexity
   */
  async generateProgressiveExplanation(
    concept: string,
    content: string,
    persona: UserPersona,
    currentLevel: 'foundation' | 'intermediate' | 'advanced' = 'foundation'
  ): Promise<PersonalizedContent> {
    try {
      const interests = [
        ...(persona.primaryInterests || []),
        ...(persona.secondaryInterests || []),
      ];

      let prompt = `Explain "${concept}" at ${currentLevel} level.\n\n`;
      prompt += `Content: ${content}\n\n`;
      if (interests.length > 0) {
        prompt += `Student's interests: ${interests.join(', ')}\n\n`;
        prompt += `Build explanation progressively, connecting to their interests naturally.`;
      }

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 1500,
      });

      const explanation = response.choices[0].message.content || '';
      const validation = deepPersonalizationEngine.validatePersonalization(explanation, persona);

      return {
        content: explanation,
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
      logger.error('Failed to generate progressive explanation:', error);
      throw error;
    }
  }
}
