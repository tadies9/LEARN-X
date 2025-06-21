/**
 * Dynamic Content Scaler
 * Calculates proportional response parameters based on input characteristics
 * Following LEARN-X coding standards - single responsibility
 */

import { logger } from '../../../utils/logger';

export interface ContentAnalysis {
  totalChars: number;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  technicalTerms: number;
  complexityScore: number;
  estimatedReadingTime: number;
}

export interface DynamicContentParams {
  maxTokens: number;
  chunkLimit: number;
  chunkSelectionStrategy: 'sequential' | 'smart' | 'comprehensive';
  inputChars: number;
  complexityLevel: 'low' | 'medium' | 'high';
  estimatedOutputWords: number;
  proportionalRatio: number;
}

interface ModeConfig {
  baseRatio: number;
  minTokens: number;
  maxTokens: number;
  complexityMultiplier: boolean;
}

/**
 * Scales content generation parameters based on input characteristics
 */
export class DynamicContentScaler {
  private readonly modeConfigs: Record<string, ModeConfig> = {
    explain: {
      baseRatio: 1.5,
      minTokens: 300,
      maxTokens: 4000,
      complexityMultiplier: true,
    },
    summary: {
      baseRatio: 0.3,
      minTokens: 150,
      maxTokens: 1000,
      complexityMultiplier: false,
    },
    quiz: {
      baseRatio: 0.5,
      minTokens: 200,
      maxTokens: 1500,
      complexityMultiplier: true,
    },
    flashcards: {
      baseRatio: 0.4,
      minTokens: 150,
      maxTokens: 1000,
      complexityMultiplier: false,
    },
    examples: {
      baseRatio: 2.0,
      minTokens: 400,
      maxTokens: 3000,
      complexityMultiplier: true,
    },
    practice: {
      baseRatio: 1.8,
      minTokens: 350,
      maxTokens: 2500,
      complexityMultiplier: true,
    },
  };

  /**
   * Analyze content characteristics
   */
  analyzeContent(chunks: Array<{ content: string }>): ContentAnalysis {
    const fullContent = chunks.map((c) => c.content).join(' ');
    const words = fullContent.split(/\s+/).filter((w) => w.length > 0);
    const sentences = fullContent.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const paragraphs = fullContent.split(/\n\n+/).filter((p) => p.trim().length > 0);

    // Count technical terms (simple heuristic: capitalized words, acronyms, complex words)
    const technicalTerms = words.filter(
      (word) =>
        word.length > 10 || // Long words
        /^[A-Z]{2,}$/.test(word) || // Acronyms
        /[A-Z][a-z]+[A-Z]/.test(word) // CamelCase
    ).length;

    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1);

    // Complexity score based on multiple factors
    const complexityScore = this.calculateComplexity({
      avgWordsPerSentence,
      avgWordLength,
      technicalTermDensity: technicalTerms / Math.max(words.length, 1),
    });

    return {
      totalChars: fullContent.length,
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      technicalTerms,
      complexityScore,
      estimatedReadingTime: Math.ceil(words.length / 200), // 200 words per minute
    };
  }

  /**
   * Calculate dynamic output parameters
   */
  calculateDynamicParams(
    analysis: ContentAnalysis,
    mode: string = 'explain'
  ): DynamicContentParams {
    const config = this.modeConfigs[mode] || this.modeConfigs.explain;

    // Base calculation from word count and mode ratio
    let targetTokens = Math.round((analysis.wordCount * config.baseRatio) / 0.75);

    // Apply complexity multiplier if enabled
    if (config.complexityMultiplier) {
      const complexityMultiplier = this.getComplexityMultiplier(analysis.complexityScore);
      targetTokens = Math.round(targetTokens * complexityMultiplier);
    }

    // Apply proportional scaling based on input size
    const proportionalRatio = this.calculateProportionalRatio(analysis.totalChars, mode);
    targetTokens = Math.round(targetTokens * proportionalRatio);

    // Enforce bounds
    const finalTokens = Math.max(config.minTokens, Math.min(targetTokens, config.maxTokens));

    // Calculate chunk selection strategy
    const chunkLimit = this.calculateChunkLimit(analysis);
    const chunkStrategy = this.determineChunkStrategy(analysis, chunkLimit);

    logger.info('[DynamicContentScaler] Calculated params:', {
      mode,
      inputWords: analysis.wordCount,
      complexity: analysis.complexityScore,
      targetTokens,
      finalTokens,
      chunkLimit,
      chunkStrategy,
    });

    return {
      maxTokens: finalTokens,
      chunkLimit,
      chunkSelectionStrategy: chunkStrategy,
      inputChars: analysis.totalChars,
      complexityLevel: this.getComplexityLevel(analysis.complexityScore),
      estimatedOutputWords: Math.round(finalTokens * 0.75),
      proportionalRatio,
    };
  }

  /**
   * Calculate complexity score (0-10)
   */
  private calculateComplexity(factors: {
    avgWordsPerSentence: number;
    avgWordLength: number;
    technicalTermDensity: number;
  }): number {
    const sentenceComplexity = Math.min(factors.avgWordsPerSentence / 25, 1) * 3;
    const wordComplexity = Math.min(factors.avgWordLength / 7, 1) * 3;
    const technicalComplexity = Math.min(factors.technicalTermDensity * 10, 1) * 4;

    return sentenceComplexity + wordComplexity + technicalComplexity;
  }

  /**
   * Get complexity multiplier based on score
   */
  private getComplexityMultiplier(score: number): number {
    if (score > 7) return 2.0; // High complexity
    if (score > 4) return 1.5; // Medium complexity
    return 1.0; // Low complexity
  }

  /**
   * Get complexity level label
   */
  private getComplexityLevel(score: number): 'low' | 'medium' | 'high' {
    if (score > 7) return 'high';
    if (score > 4) return 'medium';
    return 'low';
  }

  /**
   * Calculate proportional ratio based on input size
   */
  private calculateProportionalRatio(totalChars: number, mode: string): number {
    // Very short input (< 500 chars)
    if (totalChars < 500) {
      return mode === 'explain' ? 2.0 : 1.5;
    }

    // Short input (< 2000 chars)
    if (totalChars < 2000) {
      return 1.2;
    }

    // Medium input (< 5000 chars)
    if (totalChars < 5000) {
      return 1.0;
    }

    // Long input (< 10000 chars)
    if (totalChars < 10000) {
      return 0.8;
    }

    // Very long input
    return 0.6;
  }

  /**
   * Calculate dynamic chunk limit based on content
   */
  private calculateChunkLimit(analysis: ContentAnalysis): number {
    // Base on content size
    if (analysis.totalChars < 2000) {
      return 5; // Small content
    }

    if (analysis.totalChars < 5000) {
      return 15; // Medium content
    }

    if (analysis.totalChars < 10000) {
      return 25; // Large content
    }

    if (analysis.totalChars < 20000) {
      return 40; // Very large content
    }

    return 50; // Massive content
  }

  /**
   * Determine chunk selection strategy
   */
  private determineChunkStrategy(
    analysis: ContentAnalysis,
    chunkLimit: number
  ): 'sequential' | 'smart' | 'comprehensive' {
    // Small content - use all chunks sequentially
    if (analysis.totalChars < 3000) {
      return 'sequential';
    }

    // Medium content with low complexity - sequential is fine
    if (analysis.totalChars < 8000 && analysis.complexityScore < 5) {
      return 'sequential';
    }

    // Large or complex content - use smart selection
    if (analysis.totalChars < 15000 || analysis.complexityScore > 7) {
      return 'smart';
    }

    // Very large content - comprehensive analysis needed
    return 'comprehensive';
  }
}
