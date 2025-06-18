import { UserPersona } from '../../types';

/**
 * Deep Personalization Engine
 * Creates seamless, natural personalization that weaves user interests
 * into educational content without explicitly announcing it
 */
export class DeepPersonalizationEngine {
  /**
   * Extract the user's primary contextual lens for explanations
   */
  getPrimaryLens(persona: UserPersona): string {
    // Use the first primary interest as the main lens
    if (persona.primaryInterests && persona.primaryInterests.length > 0) {
      return persona.primaryInterests[0];
    }

    // Fallback to professional background
    if (persona.currentRole && persona.currentRole !== 'Student') {
      return persona.currentRole.toLowerCase();
    }

    // Default lens
    return 'everyday life';
  }

  /**
   * Get contextual anchors from user's world
   */
  getContextualAnchors(persona: UserPersona): {
    places: string[];
    experiences: string[];
    domains: string[];
  } {
    const anchors: {
      places: string[];
      experiences: string[];
      domains: string[];
    } = {
      places: [],
      experiences: [],
      domains: [],
    };

    // Extract from interests
    const interests = [...(persona.primaryInterests || []), ...(persona.hobbies || [])];

    interests.forEach((interest) => {
      const lowerInterest = interest.toLowerCase();

      // Sports/games → experiences and places
      if (['basketball', 'football', 'soccer', 'tennis', 'golf'].includes(lowerInterest)) {
        anchors.experiences.push(`playing ${interest}`, `watching ${interest} games`);
        anchors.places.push(`${interest} court`, `${interest} field`, 'sports arena');
        anchors.domains.push(interest, 'athletics', 'competition', 'teamwork');
      }

      // Gaming → experiences and domains
      else if (['gaming', 'video games', 'rpg', 'strategy games'].includes(lowerInterest)) {
        anchors.experiences.push('leveling up', 'resource management', 'strategic planning');
        anchors.domains.push('game mechanics', 'progression systems', 'virtual economies');
      }

      // Technology → domains and experiences
      else if (
        ['computer science', 'programming', 'software', 'ai', 'machine learning'].includes(
          lowerInterest
        )
      ) {
        anchors.experiences.push('debugging code', 'optimizing algorithms', 'system design');
        anchors.domains.push('software development', 'data structures', 'computational thinking');
      }

      // Music → experiences and domains
      else if (['music', 'piano', 'guitar', 'singing'].includes(lowerInterest)) {
        anchors.experiences.push('practicing scales', 'composing melodies', 'performing');
        anchors.domains.push('harmony', 'rhythm', 'musical composition');
      }

      // Business/Finance → domains and experiences
      else if (['business', 'finance', 'economics', 'entrepreneurship'].includes(lowerInterest)) {
        anchors.experiences.push('market analysis', 'investment decisions', 'business planning');
        anchors.domains.push('market dynamics', 'financial systems', 'economic principles');
      }

      // General interests
      else {
        anchors.domains.push(interest);
      }
    });

    // Add professional context
    if (persona.currentRole && persona.industry) {
      anchors.experiences.push(`working as a ${persona.currentRole}`);
      anchors.domains.push(persona.industry.toLowerCase());
    }

    return anchors;
  }

  /**
   * Generate personalization instructions for natural integration
   */
  buildPersonalizationInstructions(
    persona: UserPersona,
    contentType: 'explanation' | 'summary' | 'examples'
  ): string {
    const primaryLens = this.getPrimaryLens(persona);
    const anchors = this.getContextualAnchors(persona);

    const baseInstructions = `
PERSONALIZATION CONTEXT:
Primary Lens: ${primaryLens}
User Background: ${persona.currentRole || 'Student'} in ${persona.industry || 'General'}
Learning Style: ${persona.learningStyle || 'mixed'}
Technical Level: ${persona.technicalLevel || 'intermediate'}

NATURAL INTEGRATION RULES:
1. NEVER announce personalization ("since you like X", "as a Y enthusiast")
2. Use ${primaryLens} as your PRIMARY metaphorical framework
3. Weave examples from their world naturally into explanations
4. Make analogies feel discovered, not forced
5. Use domain terminology from: ${anchors.domains.slice(0, 3).join(', ')}
6. Reference familiar experiences: ${anchors.experiences.slice(0, 3).join(', ')}

TONE AND STYLE:
- ${this.getToneInstruction(persona)}
- ${this.getDensityInstruction(persona)}
- ${this.getLearningStyleInstruction(persona)}`;

    if (contentType === 'explanation') {
      return (
        baseInstructions +
        `

EXPLANATION APPROACH:
- Open with a hook using their primary interest
- Build explanations using ${primaryLens} terminology naturally
- Use progressive complexity matching their technical level
- Connect abstract concepts to their concrete experiences
- End with implications relevant to their goals`
      );
    }

    if (contentType === 'summary') {
      return (
        baseInstructions +
        `

SUMMARY APPROACH:
- Frame key points through their conceptual lens
- Use their domain's organizational patterns
- Highlight connections to their interests
- Structure using familiar frameworks from ${primaryLens}`
      );
    }

    if (contentType === 'examples') {
      return (
        baseInstructions +
        `

EXAMPLE APPROACH:
- Draw scenarios from ${anchors.domains.join(', ')}
- Use situations they'd actually encounter
- Build on experiences like: ${anchors.experiences.join(', ')}
- Make examples feel personally relevant`
      );
    }

    return baseInstructions;
  }

  /**
   * Build a deeply personalized prompt that creates seamless integration
   */
  buildDeepPersonalizedPrompt(
    persona: UserPersona,
    content: string,
    contentType: 'explanation' | 'summary' | 'examples',
    topic?: string
  ): string {
    const instructions = this.buildPersonalizationInstructions(persona, contentType);
    const primaryLens = this.getPrimaryLens(persona);

    const systemPrompt = `You are an expert educator who creates deeply personalized content. Your specialty is weaving a learner's interests naturally into educational explanations without ever announcing the personalization.

${instructions}

TRANSFORMATION EXAMPLES:

Generic: "Market volatility refers to price fluctuations in financial markets."
Personalized for ${primaryLens}: "Market volatility captures the constant momentum shifts - much like how game-changing plays can suddenly swing a close match. When major economic news hits, prices surge and retreat just as teams respond to crucial turnovers."

Generic: "Photosynthesis converts light energy into chemical energy."
Personalized for ${primaryLens}: "Photosynthesis operates like the ultimate resource conversion system. Sunlight becomes the primary input that plants process into glucose - their stored energy currency. The efficiency rivals the most optimized energy management systems."

YOUR TASK:
Transform the following content to feel naturally written for someone whose world revolves around ${primaryLens}. Make every explanation, example, and connection feel like it was discovered from their perspective, not inserted artificially.

CONTENT TO TRANSFORM:
${content}

${topic ? `TOPIC FOCUS: ${topic}` : ''}

Create content that makes the learner think "This was written exactly for me" without ever being told it was personalized.`;

    return systemPrompt;
  }

  /**
   * Generate natural analogies from user's domain
   */
  generateNaturalAnalogy(
    concept: string,
    persona: UserPersona
  ): {
    setup: string;
    mechanism: string;
    connection: string;
  } {
    const anchors = this.getContextualAnchors(persona);

    // This would typically be generated by AI, but here's the structure
    return {
      setup: `Consider how ${anchors.experiences[0] || 'familiar systems'} operate`,
      mechanism: `The key process involves ${anchors.domains[0] || 'structured interactions'}`,
      connection: `In the same way, ${concept} follows similar patterns`,
    };
  }

  /**
   * Quality validation for personalized content
   */
  validatePersonalization(
    content: string,
    persona: UserPersona
  ): {
    score: number;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Check for explicit personalization mentions
    const explicitPatterns = [
      /since you['\s]re interested in/i,
      /as a .* enthusiast/i,
      /because you like/i,
      /given your interest in/i,
      /for someone who loves/i,
    ];

    explicitPatterns.forEach((pattern) => {
      if (pattern.test(content)) {
        issues.push('Explicit personalization announcement detected');
        score -= 20;
      }
    });

    // Check if primary interest is naturally integrated
    const primaryLens = this.getPrimaryLens(persona);
    const lensTerms = primaryLens.toLowerCase().split(' ');
    const hasNaturalIntegration = lensTerms.some(
      (term) =>
        content.toLowerCase().includes(term) &&
        !content.toLowerCase().includes(`since you ${term}`) &&
        !content.toLowerCase().includes(`as a ${term}`)
    );

    if (!hasNaturalIntegration) {
      issues.push('Primary interest not naturally integrated');
      score -= 15;
      suggestions.push(`Weave ${primaryLens} terminology naturally into explanations`);
    }

    // Check for natural flow
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length < 3) {
      issues.push('Content too brief for proper personalization');
      score -= 10;
    }

    // Check learning style alignment
    const learningStyle = persona.learningStyle;
    if (learningStyle === 'visual' && !/visualize|imagine|picture|see|appearance/i.test(content)) {
      suggestions.push('Add more visual language for visual learner');
    }

    return {
      score: Math.max(0, score),
      issues,
      suggestions,
    };
  }

  private getToneInstruction(persona: UserPersona): string {
    const toneMap: Record<string, string> = {
      formal: 'Maintain formal academic language with proper terminology',
      professional: 'Use professional yet accessible language',
      friendly: 'Write in a warm, encouraging conversational style',
      casual: 'Use relaxed, natural language as if explaining to a friend',
      academic: 'Employ scholarly language with precise technical terms',
    };

    return toneMap[persona.communicationTone || 'friendly'] || toneMap.friendly;
  }

  private getDensityInstruction(persona: UserPersona): string {
    const densityMap: Record<string, string> = {
      concise: 'Be direct and focused, highlighting key insights efficiently',
      comprehensive: 'Provide rich detail with thorough context and examples',
    };

    return densityMap[persona.contentDensity || 'concise'] || densityMap.concise;
  }

  private getLearningStyleInstruction(persona: UserPersona): string {
    const styleMap: Record<string, string> = {
      visual: 'Paint vivid mental pictures and use spatial descriptions',
      auditory: 'Use rhythmic language and conversational flow patterns',
      reading: 'Structure with clear logical progression and written clarity',
      kinesthetic: 'Focus on actions, processes, and hands-on understanding',
      mixed: 'Blend multiple approaches for comprehensive engagement',
    };

    return styleMap[persona.learningStyle || 'mixed'] || styleMap.mixed;
  }

  /**
   * Create contextual examples from user's world
   */
  generateContextualExamples(concept: string, persona: UserPersona, count: number = 2): string[] {
    const anchors = this.getContextualAnchors(persona);
    const examples: string[] = [];

    // This would be AI-generated, but here's the approach:
    anchors.domains.slice(0, count).forEach((domain) => {
      examples.push(`Consider how ${concept} appears in ${domain} contexts...`);
    });

    return examples;
  }

  /**
   * Adapt complexity based on user's technical level and background
   */
  getComplexityLevel(
    persona: UserPersona,
    topic: string
  ): {
    conceptualDepth: 'surface' | 'moderate' | 'deep';
    technicalLanguage: 'minimal' | 'balanced' | 'extensive';
    exampleSophistication: 'basic' | 'intermediate' | 'advanced';
  } {
    const baseLevel = persona.technicalLevel || 'intermediate';

    // Adjust based on domain familiarity
    const interests = [...(persona.primaryInterests || []), ...(persona.hobbies || [])];
    const topicLower = topic.toLowerCase();
    const hasDomainExpertise = interests.some(
      (interest) =>
        topicLower.includes(interest.toLowerCase()) || interest.toLowerCase().includes(topicLower)
    );

    if (hasDomainExpertise && baseLevel !== 'beginner') {
      return {
        conceptualDepth: 'deep',
        technicalLanguage: 'extensive',
        exampleSophistication: 'advanced',
      };
    }

    const levelMap: Record<string, {
      conceptualDepth: 'surface' | 'moderate' | 'deep';
      technicalLanguage: 'minimal' | 'balanced' | 'extensive';
      exampleSophistication: 'basic' | 'intermediate' | 'advanced';
    }> = {
      beginner: {
        conceptualDepth: 'surface',
        technicalLanguage: 'minimal',
        exampleSophistication: 'basic',
      },
      intermediate: {
        conceptualDepth: 'moderate',
        technicalLanguage: 'balanced',
        exampleSophistication: 'intermediate',
      },
      advanced: {
        conceptualDepth: 'deep',
        technicalLanguage: 'extensive',
        exampleSophistication: 'advanced',
      },
    };

    return levelMap[baseLevel] || levelMap.intermediate;
  }
}

export const deepPersonalizationEngine = new DeepPersonalizationEngine();
