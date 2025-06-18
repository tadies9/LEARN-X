import { openAIService } from '../../openai/OpenAIService';
import { deepPersonalizationEngine } from '../../personalization/DeepPersonalizationEngine';
import { AICache } from '../../cache/AICache';
import { CostTracker } from '../../ai/CostTracker';
import { logger } from '../../../utils/logger';
import { UserPersona } from '../../../types/persona';
import { DeepExplanationParams, PersonalizedContent } from './types';

/**
 * Canonical list of broad‑domain keywords used for interest relevance scoring.
 * Keeping this at module scope avoids recreating the array on every call and
 * makes tuning easier.
 */
const DOMAIN_KEYWORDS = [
  'technology',
  'business',
  'science',
  'health',
  'finance',
  'marketing',
  'data',
  'programming',
  'design',
  'education',
  'research',
] as const;

/**
 * Intelligently select the most relevant interests based on content context
 */
const selectRelevantInterests = (
  persona: UserPersona,
  content: string,
  topic: string
): string[] => {
  const allInterests = [
    ...(persona.primaryInterests || []),
    ...(persona.secondaryInterests || []),
    ...(persona.learningGoals || []), // Use learningGoals instead of learningTopics
  ];

  if (allInterests.length === 0) return [];

  // Content keywords for matching
  const contentText = `${topic} ${content}`.toLowerCase();

  // Score interests based on relevance to content
  const scoredInterests = allInterests.map((interest) => {
    const interestWords = interest.toLowerCase().split(' ');
    let score = 0;

    // Higher score for primary interests
    if (persona.primaryInterests?.includes(interest)) {
      score += 2;
    }

    // Score based on keyword matches
    interestWords.forEach((word: string) => {
      if (contentText.includes(word)) {
        score += 3;
      }
    });

    // Bonus for domain-related interests
    if (
      DOMAIN_KEYWORDS.some(
        (keyword) => interest.toLowerCase().includes(keyword) && contentText.includes(keyword)
      )
    ) {
      score += 2;
    }

    return { interest, score };
  });

  // Sort by score and take top 3-4 interests
  const selectedInterests = scoredInterests
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.interest);

  // Ensure we have at least 2 interests for engagement
  if (selectedInterests.length < 2 && allInterests.length >= 2) {
    // Add highest-scored interests if we don't have enough relevant ones
    const remainingInterests = allInterests.filter((i) => !selectedInterests.includes(i));
    selectedInterests.push(...remainingInterests.slice(0, 2 - selectedInterests.length));
  }

  return selectedInterests;
};

/**
 * Build a dynamic system prompt that adapts to content and student interests
 */
const buildSystemPrompt = (persona: UserPersona, content: string, topic: string): string => {
  const relevantInterests = selectRelevantInterests(persona, content, topic);
  const interestContext =
    relevantInterests.length > 0
      ? `Student's key interests that should guide examples: ${relevantInterests.join(', ')}`
      : 'Use general engaging examples';

  const learningStyle = persona.learningStyle ?? 'mixed';
  const technicalLevel = persona.technicalLevel ?? 'intermediate';
  const industry = persona.industry ?? 'general';
  const communicationTone = persona.communicationTone ?? 'professional';

  return `You are LEARN-X, an expert tutor who crafts deeply-personalized HTML explanations.

## OUTPUT RULES
Return ONLY inner HTML (no <html>, <body>, <head> tags).
Use semantic tags like <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <figure>, <figcaption>.
Limit each paragraph to ≤4 sentences and insert a blank line between block elements.

## PERSONALIZATION CONTEXT
Learning Style: ${learningStyle}
Technical Level: ${technicalLevel}
Industry Context: ${industry}
Communication Preference: ${communicationTone}
${interestContext}

## ADAPTIVE ENGAGEMENT STRATEGY
${
  relevantInterests.length > 0
    ? `
- Connect concepts to: ${relevantInterests.slice(0, 2).join(' and ')}
- Use examples from: ${relevantInterests.join(', ')} domains
- Make analogies that bridge the student's interests with the learning material
`
    : "- Use relatable, real-world examples appropriate for the student's background"
}

## STRUCTURE REQUIREMENTS
1. <h2>Main Topic</h2>
2. Each key concept uses <h3>
3. Use <ul>/<li> for any list with 3+ items
4. Begin with a compelling hook that connects to the student's world

## VISUAL REQUIREMENTS
• Create at least 1 visual using ACTUAL code/markup (not placeholder paths):
  - For diagrams: Use <pre class="mermaid">...</pre> with valid Mermaid syntax
  - For tables: Use proper HTML <table> with <thead>, <tbody>, <tr>, <th>, <td>
  - For comparisons: Create visual tables or charts
${learningStyle === 'visual' ? '• Include ≥2 distinct visuals with detailed captions' : ''}
• NEVER use placeholder image paths like "path/to/image" 
• Every visual needs a <figcaption> explaining its relevance

## MERMAID DIAGRAM RULES - FOLLOW EXACTLY:

1. MERMAID DIAGRAMS MUST BE COMPLETE AND SEPARATE FROM TEXT
   - NEVER mix regular text with diagram syntax
   - NEVER put partial diagrams inside paragraphs
   - Each diagram must be a complete, standalone element
   - NEVER mix HTML table tags with Mermaid syntax

2. CORRECT MERMAID SYNTAX:
<figure>
<pre class="mermaid">
graph TD
    A[Node Label Here] --> B[Another Node]
    B --> C[Third Node]
    C --> D[Final Node]
</pre>
<figcaption>Clear description of what the diagram shows</figcaption>
</figure>

3. FORBIDDEN PATTERNS:
   ❌ "Understanding Report Structure A[Node] --> B[Node]" (mixed with text)
   ❌ "graph TD A --> B inside a paragraph" (incomplete)
   ❌ Single line: graph TD A[Start] --> B[End] C[Other] --> D[More]
   ❌ <table>graph TD A[Node]</table> (NEVER mix HTML with Mermaid!)
   ❌ graph<td>TD A[Node]</td> (NEVER embed Mermaid in HTML tags!)

4. VALID NODE LABELS:
   ✅ A[Short Clear Label]
   ✅ B[Maximum 3-4 Words]
   ❌ A[This is a very long label that goes on and on]
   ❌ A[<th>Label</th>] (NO HTML in node labels!)

5. SIMPLE DIAGRAMS ONLY:
   - Maximum 6-8 nodes per diagram
   - Use clear, simple connections (-->)
   - One concept per diagram
   - NO HTML tags anywhere in the diagram

6. EXAMPLE OF A COMPLETE, VALID DIAGRAM:
<figure>
<pre class="mermaid">
graph TD
    A[User Input] --> B[Process Data]
    B --> C[Generate Output]
    C --> D[Display Results]
    B --> E[Error Check]
    E --> F[Log Errors]
</pre>
<figcaption>Data processing workflow</figcaption>
</figure>

CRITICAL: NEVER mix HTML tags (like <table>, <th>, <td>) with Mermaid syntax!

## TECHNICAL LEVEL ADAPTATION
${
  technicalLevel === 'beginner'
    ? `
• Include <aside class="glossary"> with 3-4 key term definitions
• Use simple analogies from ${relevantInterests[0] || 'everyday life'}
• Provide step-by-step breakdowns
`
    : technicalLevel === 'advanced'
      ? `
• Include technical depth and nuanced explanations
• Reference advanced concepts and industry standards
• Challenge thinking with complex scenarios
`
      : `
• Balance accessibility with depth
• Provide both conceptual understanding and practical applications
• Include intermediate-level examples and use cases
`
}

## INTEREST-DRIVEN EXAMPLES
${
  relevantInterests.length > 1
    ? `
Create examples that naturally incorporate these interests:
${relevantInterests.map((interest, i) => `${i + 1}. ${interest}`).join('\n')}

Rotate between these interests to maintain engagement and show diverse applications.
`
    : ''
}

## DYNAMIC CONTENT ADAPTATION
• Analyze the specific content and adapt explanations accordingly
• Use industry-specific terminology when relevant to ${industry}
• Match communication style to ${communicationTone} preference
• Ensure examples feel authentic and not forced

## ENGAGEMENT PRINCIPLES
• Make learning feel relevant to the student's goals and interests
• Use storytelling when appropriate
• Include interactive elements or thought-provoking questions
• Connect abstract concepts to concrete, relatable scenarios

Remember: Each student is unique. Adapt your explanations to feel personally crafted for THIS individual's background, interests, and learning goals. Avoid generic examples - make everything feel tailored and relevant.`;
};

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
            content: buildSystemPrompt(params.persona, content, params.topic),
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
      const relevantInterests = selectRelevantInterests(persona, content, concept);

      let prompt = `Explain "${concept}" at ${currentLevel} level.\n\n`;
      prompt += `Content: ${content}\n\n`;

      if (relevantInterests.length > 0) {
        prompt += `Student's relevant interests: ${relevantInterests.join(', ')}\n\n`;
        prompt += `Build explanation progressively, connecting to their interests naturally. `;
        prompt += `Use examples from ${relevantInterests.slice(0, 2).join(' and ')} to make concepts engaging.`;
      } else {
        prompt += `Build explanation progressively with engaging, relatable examples.`;
      }

      const response = await openAIService.getClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(persona, content, concept),
          },
          { role: 'user', content: prompt },
        ],
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
