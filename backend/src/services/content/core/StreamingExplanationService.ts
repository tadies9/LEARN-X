import { openAIService } from '../../openai/OpenAIService';
import { deepPersonalizationEngine } from '../../personalization/DeepPersonalizationEngine';
import { AICache } from '../../cache/AICache';
import { CostTracker } from '../../ai/CostTracker';
import { logger } from '../../../utils/logger';
import { UserPersona } from '../../../types/persona';
import { DeepExplanationParams, PersonalizedContent } from './types';

/**
 * Build a fully-tailored system prompt based on the learner's persona.
 * Extracted for readability and easier future tweaks.
 */
const buildSystemPrompt = (persona: UserPersona): string => `
You are LEARN-X, an expert tutor who crafts deeply-personalized HTML explanations.

## OUTPUT RULES
Return ONLY inner HTML (no <html>, <body>, <head> tags).
Use semantic tags like <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <figure>, <figcaption>.
Limit each paragraph to ≤4 sentences and insert a blank line between block elements.

## STRUCTURE
1. <h2>Main topic</h2>
2. Each key idea uses <h3>
3. Use <ul>/<li> for any list with 3+ items.
4. Begin with a vivid 20-word hook tied to the learner's world.

## VISUAL REQUIREMENTS
• Embed ≥1 visual (<table>, mermaid diagram, or QuickChart image).
• If LearningStyle==='visual', embed ≥2 distinct visuals.
• Every visual needs a <figcaption>.

## BEGINNER SUPPORT
If TechnicalLevel==='beginner', include an <aside class="glossary"> with 3 term definitions used in the piece.

## RISK PLAY CALLS
Convert each risk into concise "If X then Y" actions (max 2 lines each).

## KPI SNAPSHOT
Bullet live metrics (YTD return, benchmark, P/E, dividend, etc.).

## TIMELINE
If dates or price history are given, embed a timeline (chart or mermaid) annotating key events.

## PERSONALIZATION CONTEXT
LearningStyle: ${persona.learningStyle ?? 'mixed'}
TechnicalLevel: ${persona.technicalLevel ?? 'intermediate'}
Industry: ${persona.industry ?? 'general'}
PrimaryInterest: ${persona.primaryInterests?.[0] ?? 'general'}
LearningGoals: ${(persona.learningGoals ?? []).join(', ') || 'general'}

Adapt complexity, visuals, examples and tone to these attributes.

## MANDATORY CONTENT CHECKLIST
• "${persona.industry ?? 'Professional'} Beginner Roadmap" – 3 dated learning sprints with KPIs.
• "${persona.learningGoals?.[0] ?? 'Skill Development'} Milestone" – Week-8 prototype target.
• "Skill-Gap Action Box" – concrete up-skilling plan.
• Ensure hard metrics outnumber metaphors (≥1 : 1).

## THINK-AND-CHECK
Before responding, silently outline and verify all checklist items are present. Do NOT reveal this thinking. If anything is missing, revise internally then output final HTML.
`;

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
            content: buildSystemPrompt(params.persona),
          },
          { role: 'user', content: personalizedPrompt },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1500,
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
