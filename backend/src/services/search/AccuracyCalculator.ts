import { SearchResult } from './types';

export interface QueryIntent {
  type: 'definition' | 'explanation' | 'example' | 'comparison' | 'how-to' | 'general';
  keywords: string[];
  concepts: string[];
  expectedContentTypes: string[];
}

export interface RelevanceScores {
  relevanceScore: number;
  finalScore: number;
  sectionRelevance?: number;
  keywordDensity: number;
  structureBonus: number;
  intentAlignment: number;
}

export class AccuracyCalculator {
  /**
   * Calculate text similarity using Jaccard similarity
   */
  calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate keyword density in content
   */
  calculateKeywordDensity(content: string, keywords: string[]): number {
    const lowerContent = content.toLowerCase();
    const contentWords = lowerContent.split(/\s+/).length;

    let keywordCount = 0;
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) {
        keywordCount += matches.length;
      }
    });

    return Math.min(keywordCount / contentWords, 0.1) * 10; // Normalize to 0-1
  }

  /**
   * Calculate precision score
   */
  calculatePrecision(relevantResults: number, totalResults: number): number {
    return totalResults > 0 ? relevantResults / totalResults : 0;
  }

  /**
   * Calculate recall score (estimated)
   */
  calculateRecall(relevantResults: number, expectedResults: number): number {
    return expectedResults > 0 ? relevantResults / expectedResults : 0;
  }

  /**
   * Calculate F1 score from precision and recall
   */
  calculateF1Score(precision: number, recall: number): number {
    return precision + recall > 0 ? (2 * (precision * recall)) / (precision + recall) : 0;
  }

  /**
   * Calculate comprehensive relevance scores for search results
   */
  async calculateRelevanceScores(
    results: SearchResult[],
    query: string,
    intent: QueryIntent
  ): Promise<SearchResult[]> {
    const relevanceScores = await Promise.all(
      results.map(async (result) => {
        const scores = this.calculateIndividualRelevance(result, query, intent);

        return {
          ...result,
          ...scores,
        };
      })
    );

    return relevanceScores.sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Calculate relevance scores for individual result
   */
  private calculateIndividualRelevance(
    result: SearchResult,
    query: string,
    intent: QueryIntent
  ): RelevanceScores {
    let relevance = 0;

    // Title/section relevance (20% weight)
    let sectionRelevance = 0;
    if (result.metadata.sectionTitle) {
      sectionRelevance = this.calculateTextSimilarity(query, result.metadata.sectionTitle);
      relevance += sectionRelevance * 0.2;
    }

    // Keyword density (30% weight)
    const keywordDensity = this.calculateKeywordDensity(result.content, intent.keywords);
    relevance += keywordDensity * 0.3;

    // Structure bonus (10% weight) - assuming hierarchyLevel exists or default to 5
    const hierarchyLevel = (result.metadata as any).hierarchyLevel || 5;
    const structureBonus = hierarchyLevel <= 2 ? 0.1 : 0;
    relevance += structureBonus;

    // Intent alignment (20% weight)
    const intentAlignment = (result as any).intentMatch ? 0.2 : 0;
    relevance += intentAlignment;

    // Concept matching bonus (20% weight)
    const conceptBonus = this.calculateConceptMatchScore(result, intent.concepts);
    relevance += conceptBonus * 0.2;

    const finalScore = result.score * 0.7 + relevance * 0.3;

    return {
      relevanceScore: relevance,
      finalScore,
      sectionRelevance,
      keywordDensity,
      structureBonus,
      intentAlignment,
    };
  }

  /**
   * Calculate concept matching score
   */
  private calculateConceptMatchScore(result: SearchResult, concepts: string[]): number {
    const resultConcepts = result.metadata.concepts || [];
    const matchCount = concepts.filter((c) =>
      resultConcepts.some((rc: string) => rc.toLowerCase().includes(c.toLowerCase()))
    ).length;

    return Math.min(matchCount * 0.1, 0.5); // Cap at 0.5
  }

  /**
   * Calculate average relevance score for a set of results
   */
  calculateAverageRelevance(results: SearchResult[]): number {
    if (results.length === 0) return 0;

    const totalRelevance = results.reduce(
      (sum, result) => sum + ((result as any).relevanceScore || result.score),
      0
    );

    return totalRelevance / results.length;
  }

  /**
   * Calculate diversity score based on unique sections and content types
   */
  calculateDiversityScore(results: SearchResult[]): number {
    if (results.length === 0) return 0;

    const uniqueSections = new Set(results.map((r) => r.metadata.sectionTitle));
    const uniqueTypes = new Set(results.map((r) => r.metadata.contentType));

    return (uniqueSections.size + uniqueTypes.size) / (results.length * 2);
  }

  /**
   * Calculate expected number of results based on query complexity
   */
  calculateExpectedResults(intent: QueryIntent): number {
    const baseExpected = Math.min(intent.keywords.length * 2, 10);

    // Adjust based on query type
    switch (intent.type) {
      case 'definition':
        return Math.min(baseExpected, 5);
      case 'example':
        return Math.max(baseExpected, 8);
      case 'comparison':
        return Math.max(baseExpected, 12);
      default:
        return baseExpected;
    }
  }
}
