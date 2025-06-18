import { AccuracyCalculator, QueryIntent } from './AccuracyCalculator';

export class ResultProcessor {
  private calculator: AccuracyCalculator;

  constructor() {
    this.calculator = new AccuracyCalculator();
  }

  /**
   * Post-process results to improve accuracy
   */
  async postProcessResults(results: any, intent: QueryIntent, query: string): Promise<any> {
    let processedResults = [...results.results];

    // 1. Filter by intent-specific criteria
    if (intent.expectedContentTypes.length > 0) {
      processedResults = this.boostByContentType(processedResults, intent.expectedContentTypes);
    }

    // 2. Concept matching boost
    if (intent.concepts.length > 0) {
      processedResults = this.boostByConceptMatch(processedResults, intent.concepts);
    }

    // 3. Re-rank based on query-specific relevance using AccuracyCalculator
    processedResults = await this.calculator.calculateRelevanceScores(processedResults, query, intent);

    // 4. Ensure diversity for broader queries
    if (intent.type === 'general' || intent.type === 'comparison') {
      processedResults = this.ensureDiversity(processedResults);
    }

    return {
      ...results,
      results: processedResults,
    };
  }

  /**
   * Boost results that match expected content types
   */
  private boostByContentType(results: any[], expectedTypes: string[]): any[] {
    return results
      .map((result) => {
        if (expectedTypes.includes(result.metadata.contentType)) {
          result.score *= 1.2;
          result.intentMatch = true;
        }
        return result;
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Boost results that contain query concepts
   */
  private boostByConceptMatch(results: any[], concepts: string[]): any[] {
    return results
      .map((result) => {
        const resultConcepts = result.metadata.concepts || [];
        const matchCount = concepts.filter((c) =>
          resultConcepts.some((rc: string) => rc.toLowerCase().includes(c.toLowerCase()))
        ).length;

        if (matchCount > 0) {
          result.score *= 1 + 0.1 * matchCount;
          result.conceptMatches = matchCount;
        }

        return result;
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Ensure diversity in results
   */
  private ensureDiversity(results: any[]): any[] {
    const diverse: any[] = [];
    const seenSections = new Set<string>();
    const seenTypes = new Set<string>();

    for (const result of results) {
      const section = result.metadata.sectionTitle || 'unknown';
      const type = result.metadata.contentType;

      // Prioritize unseen sections and types
      if (!seenSections.has(section) || !seenTypes.has(type)) {
        diverse.push(result);
        seenSections.add(section);
        seenTypes.add(type);
      } else if (diverse.length < results.length * 0.7) {
        // Still include if we haven't reached 70% of results
        diverse.push(result);
      }
    }

    return diverse;
  }

  /**
   * Analyze result quality metrics
   */
  analyzeResultQuality(results: any[]): {
    avgScore: number;
    topScore: number;
    intentMatches: number;
    conceptMatches: number;
    contentTypeDistribution: Record<string, number>;
    sectionDistribution: Record<string, number>;
  } {
    if (results.length === 0) {
      return {
        avgScore: 0,
        topScore: 0,
        intentMatches: 0,
        conceptMatches: 0,
        contentTypeDistribution: {},
        sectionDistribution: {},
      };
    }

    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const topScore = Math.max(...results.map(r => r.score));
    const intentMatches = results.filter(r => r.intentMatch).length;
    const conceptMatches = results.filter(r => r.conceptMatches && r.conceptMatches > 0).length;

    // Content type distribution
    const contentTypeDistribution: Record<string, number> = {};
    results.forEach(r => {
      const type = r.metadata.contentType || 'unknown';
      contentTypeDistribution[type] = (contentTypeDistribution[type] || 0) + 1;
    });

    // Section distribution
    const sectionDistribution: Record<string, number> = {};
    results.forEach(r => {
      const section = r.metadata.sectionTitle || 'unknown';
      sectionDistribution[section] = (sectionDistribution[section] || 0) + 1;
    });

    return {
      avgScore,
      topScore,
      intentMatches,
      conceptMatches,
      contentTypeDistribution,
      sectionDistribution,
    };
  }

  /**
   * Filter results by minimum quality threshold
   */
  filterByQualityThreshold(results: any[], minScore: number = 0.3): any[] {
    return results.filter(result => result.score >= minScore);
  }

  /**
   * Remove duplicate results based on content similarity
   */
  removeDuplicates(results: any[], similarityThreshold: number = 0.9): any[] {
    const filtered: any[] = [];
    
    for (const result of results) {
      let isDuplicate = false;
      
      for (const existing of filtered) {
        const similarity = this.calculator.calculateTextSimilarity(
          result.content,
          existing.content
        );
        
        if (similarity >= similarityThreshold) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        filtered.push(result);
      }
    }
    
    return filtered;
  }

  /**
   * Promote high-quality results to top positions
   */
  promoteHighQualityResults(results: any[], qualityThreshold: number = 0.8): any[] {
    const highQuality = results.filter(r => r.relevanceScore >= qualityThreshold);
    const others = results.filter(r => r.relevanceScore < qualityThreshold);
    
    return [...highQuality, ...others];
  }
}