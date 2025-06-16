import { UserPersona } from '../../../types/persona';
import { logger } from '../../../utils/logger';

/**
 * Content Quality Validator
 * Evaluates the quality of personalized content
 */
export class ContentQualityValidator {
  /**
   * Evaluate quality metrics for personalized content
   */
  async evaluateQualityMetrics(
    original: string,
    personalized: string,
    persona: UserPersona
  ): Promise<{
    naturalIntegration: number;
    educationalIntegrity: number;
    relevanceEngagement: number;
    flowReadability: number;
  }> {
    try {
      // Natural Integration Score (0-1)
      const naturalIntegration = this.evaluateNaturalIntegration(personalized);
      
      // Educational Integrity Score (0-1)
      const educationalIntegrity = this.evaluateEducationalIntegrity(original, personalized);
      
      // Relevance & Engagement Score (0-1)
      const relevanceEngagement = this.evaluateRelevanceEngagement(personalized, persona);
      
      // Flow & Readability Score (0-1)
      const flowReadability = this.evaluateFlowReadability(personalized);

      return {
        naturalIntegration,
        educationalIntegrity,
        relevanceEngagement,
        flowReadability,
      };
    } catch (error) {
      logger.error('Failed to evaluate quality metrics:', error);
      return this.getDefaultQualityMetrics();
    }
  }

  /**
   * Evaluate how naturally personalization is integrated
   */
  private evaluateNaturalIntegration(content: string): number {
    let score = 1.0;

    // Penalize explicit personalization announcements
    const explicitPatterns = [
      /here's an analogy/i,
      /let me explain using/i,
      /think of.*as.*like/i,
      /analogy box/i,
      /personalized example/i,
    ];

    for (const pattern of explicitPatterns) {
      if (pattern.test(content)) {
        score -= 0.2;
      }
    }

    // Penalize artificial styling
    if (content.includes('style=') || content.includes('background:')) {
      score -= 0.3;
    }

    return Math.max(0, score);
  }

  /**
   * Evaluate educational integrity (content accuracy preserved)
   */
  private evaluateEducationalIntegrity(original: string, personalized: string): number {
    // Simple heuristic: check if key educational terms are preserved
    const educationalTerms = this.extractEducationalTerms(original);
    let preservedTerms = 0;

    for (const term of educationalTerms) {
      if (personalized.toLowerCase().includes(term.toLowerCase())) {
        preservedTerms++;
      }
    }

    return educationalTerms.length > 0 ? preservedTerms / educationalTerms.length : 1.0;
  }

  /**
   * Evaluate relevance and engagement for the persona
   */
  private evaluateRelevanceEngagement(content: string, persona: UserPersona): number {
    let score = 0.5; // Base score

    // Check for interest integration
    const allInterests = [
      ...(persona.primaryInterests || []),
      ...(persona.secondaryInterests || []),
    ];

    for (const interest of allInterests) {
      if (content.toLowerCase().includes(interest.toLowerCase())) {
        score += 0.2;
      }
    }

    // Check for professional context integration
    if (persona.industry) {
      const industry = persona.industry.toLowerCase();
      if (content.toLowerCase().includes(industry)) {
        score += 0.2;
      }
    }

    // Check for appropriate technical level
    if (persona.technicalLevel) {
      const level = persona.technicalLevel;
      score += this.evaluateTechnicalLevelMatch(content, level);
    }

    return Math.min(1.0, score);
  }

  /**
   * Evaluate flow and readability
   */
  private evaluateFlowReadability(content: string): number {
    let score = 1.0;
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;

    if (avgLength > 150 || avgLength < 20) score -= 0.2;
    
    const transitionWords = ['however', 'therefore', 'moreover', 'furthermore'];
    if (transitionWords.some(word => content.toLowerCase().includes(word))) score += 0.1;
    
    if (content.split('\n\n').length > 1) score += 0.1;
    
    return Math.min(1.0, score);
  }

  /**
   * Extract key educational terms from content
   */
  private extractEducationalTerms(content: string): string[] {
    const capitalizedWords = content.match(/\b[A-Z][a-z]+\b/g) || [];
    const technicalWords = content.match(/\b\w+(tion|ism|ogy)\b/g) || [];
    return [...new Set([...capitalizedWords, ...technicalWords])].slice(0, 10);
  }

  /**
   * Evaluate if content matches the technical level
   */
  private evaluateTechnicalLevelMatch(content: string, level: string): number {
    const words = content.split(/\s+/);
    const complexWords = words.filter(word => word.length > 8).length;
    const complexityRatio = complexWords / words.length;

    switch (level) {
      case 'beginner':
        return complexityRatio < 0.1 ? 0.2 : 0.0;
      case 'intermediate':
        return complexityRatio >= 0.1 && complexityRatio <= 0.2 ? 0.2 : 0.1;
      case 'advanced':
        return complexityRatio > 0.15 ? 0.2 : 0.1;
      case 'expert':
        return complexityRatio > 0.2 ? 0.2 : 0.1;
      default:
        return 0.1;
    }
  }

  /**
   * Get default quality metrics when evaluation fails
   */
  private getDefaultQualityMetrics() {
    return {
      naturalIntegration: 0.7,
      educationalIntegrity: 0.8,
      relevanceEngagement: 0.6,
      flowReadability: 0.7,
    };
  }
} 