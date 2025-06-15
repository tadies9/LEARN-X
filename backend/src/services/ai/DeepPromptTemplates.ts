import { UserPersona } from '../../types';
import { deepPersonalizationEngine } from '../personalization/DeepPersonalizationEngine';

/**
 * Deep Prompt Templates
 * Creates sophisticated prompts that generate seamlessly personalized content
 * without ever announcing the personalization
 */
export class DeepPromptTemplates {
  /**
   * Build an explanation prompt with deep, natural personalization
   */
  buildDeepExplanationPrompt(persona: UserPersona, content: string, topic?: string): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);
    const complexity = deepPersonalizationEngine.getComplexityLevel(persona, topic || '');

    return `You are a master educator who creates deeply personalized explanations that feel naturally written for each learner. Your specialty is seamless integration of their interests without ever announcing it.

LEARNER PROFILE:
Primary Interest Lens: ${primaryLens}
Professional Context: ${persona.currentRole || 'Student'} in ${persona.industry || 'General'}
Technical Level: ${persona.technicalLevel || 'intermediate'}
Learning Style: ${persona.learningStyle || 'mixed'}
Communication Preference: ${persona.communicationTone || 'friendly'}

PERSONALIZATION DEPTH:
Conceptual Depth: ${complexity.conceptualDepth}
Technical Language: ${complexity.technicalLanguage}
Example Sophistication: ${complexity.exampleSophistication}

NATURAL INTEGRATION STRATEGY:
1. NEVER say "Since you're interested in X" or "As a Y enthusiast"
2. Use ${primaryLens} as your primary metaphorical framework
3. Weave terminology from: ${anchors.domains.slice(0, 3).join(', ')}
4. Reference experiences like: ${anchors.experiences.slice(0, 3).join(', ')}
5. Make analogies feel discovered, not inserted

EXPLANATION APPROACH:
${this.getExplanationApproach(persona, primaryLens)}

TRANSFORMATION EXAMPLES:

Generic: "Algorithms are step-by-step procedures for solving problems."
${primaryLens} Version: "Algorithms capture the systematic approach to problem-solving - much like developing a consistent training routine that breaks down complex skills into manageable, repeatable steps. Each algorithm defines the precise sequence that transforms input challenges into desired outcomes."

Generic: "Market equilibrium occurs when supply equals demand."
${primaryLens} Version: "Market equilibrium emerges when the pressure to buy perfectly balances the pressure to sell - similar to how competitive balance creates the most engaging scenarios. When supply and demand align, prices stabilize just as evenly matched competition creates sustainable dynamics."

YOUR TASK:
Transform the following educational content into a deeply personalized explanation that feels naturally written for someone whose world revolves around ${primaryLens}. Every concept, example, and analogy should emerge organically from their perspective.

${topic ? `TOPIC: ${topic}\n` : ''}
CONTENT TO TRANSFORM:
${content}

Create an explanation that makes the learner think "This was written exactly for me" without ever being told it was personalized. The integration should be so natural that the personalization feels discovered, not announced.`;
  }

  /**
   * Build a summary prompt with contextual personalization
   */
  buildDeepSummaryPrompt(persona: UserPersona, content: string, format: string): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    return `You are creating a personalized summary that naturally integrates the learner's interests without announcing it.

LEARNER CONTEXT:
Primary Lens: ${primaryLens}
Summary Format: ${format}
Background: ${persona.currentRole || 'Student'} in ${persona.industry || 'General'}
Density Preference: ${persona.contentDensity || 'concise'}

NATURAL INTEGRATION RULES:
1. Frame key points through their conceptual lens of ${primaryLens}
2. Use organizational patterns familiar from: ${anchors.domains.slice(0, 2).join(', ')}
3. Connect insights to their world: ${anchors.experiences.slice(0, 2).join(', ')}
4. NEVER announce personalization explicitly

SUMMARY STRUCTURE:
${this.getSummaryStructure(persona, format)}

CONTENT TO SUMMARIZE:
${content}

Create a summary that feels naturally organized around concepts familiar to someone immersed in ${primaryLens}, without ever mentioning their interests explicitly.`;
  }

  /**
   * Build a prompt for generating personalized examples
   */
  buildDeepExamplesPrompt(persona: UserPersona, concept: string): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    return `Generate 2-3 concrete examples that naturally illustrate "${concept}" using scenarios from the learner's world.

LEARNER'S WORLD:
Primary Domain: ${primaryLens}
Familiar Contexts: ${anchors.domains.slice(0, 3).join(', ')}
Typical Experiences: ${anchors.experiences.slice(0, 3).join(', ')}

EXAMPLE REQUIREMENTS:
1. Draw scenarios they would actually encounter
2. Use terminology natural to ${primaryLens}
3. Make connections feel obvious, not forced
4. Progress from simple to more sophisticated
5. NEVER announce why you chose these examples

EXAMPLE STRUCTURE:
Each example should:
- Set up a familiar scenario
- Show how the concept manifests naturally
- Highlight the key mechanism
- Connect to broader implications

Generate examples that make the concept click immediately because they're drawn from contexts the learner knows intimately.`;
  }

  /**
   * Build a streaming explanation prompt for real-time personalization
   */
  buildStreamingExplanationPrompt(persona: UserPersona, chunks: any[], topic: string): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const instructions = deepPersonalizationEngine.buildPersonalizationInstructions(
      persona,
      'explanation'
    );

    // Combine chunks content
    const content = chunks.map((chunk) => chunk.content).join('\n\n');

    return `You are creating a streaming explanation that weaves the learner's interests naturally throughout the content.

${instructions}

STREAMING APPROACH:
- Hook immediately with their primary interest lens
- Build explanations progressively using ${primaryLens} terminology
- Maintain natural flow without forced connections
- Use their domain's conceptual frameworks
- End with relevant implications for their world

TOPIC: ${topic}
CONTENT TO EXPLAIN:
${content}

Stream an explanation that feels like it was written by an expert in both the subject matter and ${primaryLens}, creating natural bridges between the concepts without ever announcing the personalization.`;
  }

  /**
   * Build a chat response prompt with contextual personalization
   */
  buildPersonalizedChatPrompt(
    persona: UserPersona,
    message: string,
    context: string[],
    currentPage?: number,
    selectedText?: string
  ): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    return `You are an AI study assistant who naturally adapts responses to each learner's background and interests.

LEARNER PROFILE:
Primary Interest Area: ${primaryLens}
Professional Context: ${persona.currentRole || 'Student'} in ${persona.industry || 'General'}
Communication Style: ${persona.communicationTone || 'friendly'}

CONTEXT:
${currentPage ? `Current Page: ${currentPage}` : ''}
${selectedText ? `Selected Text: "${selectedText}"` : ''}

Relevant Content:
${context.slice(0, 3).join('\n\n')}

RESPONSE APPROACH:
1. Address their question directly and helpfully
2. Use examples and analogies from ${primaryLens} when clarifying concepts
3. Reference familiar experiences: ${anchors.experiences.slice(0, 2).join(', ')}
4. Maintain their preferred communication style
5. NEVER announce why you chose specific examples

USER MESSAGE: ${message}

Respond naturally, drawing on their background to make explanations clear and relevant without explicitly mentioning their interests.`;
  }

  /**
   * Build a quiz generation prompt with personalized scenarios
   */
  buildPersonalizedQuizPrompt(persona: UserPersona, content: string, type: string): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);
    const anchors = deepPersonalizationEngine.getContextualAnchors(persona);

    return `Create quiz questions that test understanding while using scenarios familiar to the learner.

LEARNER CONTEXT:
Primary Domain: ${primaryLens}
Familiar Scenarios: ${anchors.experiences.slice(0, 3).join(', ')}
Question Type: ${type}

PERSONALIZATION APPROACH:
- Frame questions using scenarios from ${anchors.domains.slice(0, 2).join(', ')}
- Use terminology natural to ${primaryLens}
- Create realistic situations they might encounter
- Test genuine understanding, not just recall
- NEVER mention why scenarios were chosen

CONTENT TO TEST:
${content}

Generate questions that feel naturally relevant to someone immersed in ${primaryLens}, making the assessment more engaging through familiar contexts.`;
  }

  private getExplanationApproach(persona: UserPersona, primaryLens: string): string {
    const approaches: Record<string, string> = {
      visual: `Paint vivid mental pictures using ${primaryLens} imagery. Describe how concepts "look" and "appear" in their world.`,
      auditory: `Use rhythmic language and conversational flow. Reference sounds, patterns, and verbal explanations from ${primaryLens}.`,
      kinesthetic: `Focus on actions, processes, and hands-on understanding. Emphasize how things "work" and "move" in ${primaryLens}.`,
      reading: `Structure with clear logical progression. Use precise language that builds understanding systematically.`,
    };

    return (
      approaches[persona.learningStyle || 'mixed'] ||
      `Blend multiple approaches while maintaining the ${primaryLens} perspective throughout.`
    );
  }

  private getSummaryStructure(persona: UserPersona, format: string): string {
    const primaryLens = deepPersonalizationEngine.getPrimaryLens(persona);

    if (format === 'key-points') {
      return `Organize as key insights using frameworks from ${primaryLens}. Each point should feel like a discovery from their perspective.`;
    }

    if (format === 'comprehensive') {
      return `Structure as a detailed overview using organizational patterns familiar in ${primaryLens}. Build understanding progressively.`;
    }

    if (format === 'visual-map') {
      return `Create a conceptual map using spatial relationships and visual metaphors from ${primaryLens}.`;
    }

    return `Structure using patterns familiar in ${primaryLens}, making the organization feel natural and logical.`;
  }

  /**
   * Build a quality validation prompt
   */
  buildQualityCheckPrompt(
    originalContent: string,
    personalizedContent: string,
    persona: UserPersona
  ): string {
    return `Evaluate the quality of this personalized educational content.

ORIGINAL CONTENT:
${originalContent}

PERSONALIZED VERSION:
${personalizedContent}

LEARNER PROFILE:
Primary Interest: ${deepPersonalizationEngine.getPrimaryLens(persona)}
Background: ${persona.currentRole} in ${persona.industry}

EVALUATION CRITERIA:
1. Natural Integration (0-25 points)
   - No explicit personalization announcements
   - Seamless weaving of interests
   - Feels discovered, not forced

2. Educational Integrity (0-25 points)
   - Core concepts preserved
   - Accuracy maintained
   - Learning objectives met

3. Relevance & Engagement (0-25 points)
   - Examples truly relevant to learner
   - Analogies enhance understanding
   - Content feels personally meaningful

4. Flow & Readability (0-25 points)
   - Natural narrative progression
   - Appropriate complexity level
   - Clear and engaging writing

Provide:
- Total score (0-100)
- Breakdown by criteria
- Specific strengths
- Areas for improvement
- Suggestions for enhancement

Focus on whether this feels like content written specifically for this learner without them being told it was personalized.`;
  }
}

export const deepPromptTemplates = new DeepPromptTemplates();
