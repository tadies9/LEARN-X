import { logger } from '../../utils/logger';
import { supabase } from '../../config/supabase';
import { EnhancedSearchService } from './EnhancedSearchService';

interface QueryIntent {
  type: 'definition' | 'explanation' | 'example' | 'comparison' | 'how-to' | 'general';
  keywords: string[];
  concepts: string[];
  expectedContentTypes: string[];
}

interface SearchMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  relevanceScore: number;
  diversityScore: number;
}

export class SearchAccuracyService {
  private enhancedSearch: EnhancedSearchService;

  constructor() {
    this.enhancedSearch = new EnhancedSearchService();
  }

  /**
   * Analyze query intent to improve search accuracy
   */
  async analyzeQueryIntent(query: string): Promise<QueryIntent> {
    const lowerQuery = query.toLowerCase();
    
    // Detect query type based on patterns
    let type: QueryIntent['type'] = 'general';
    const expectedContentTypes: string[] = [];

    if (lowerQuery.includes('what is') || lowerQuery.includes('define') || lowerQuery.includes('definition')) {
      type = 'definition';
      expectedContentTypes.push('definition', 'key-concept');
    } else if (lowerQuery.includes('explain') || lowerQuery.includes('how does') || lowerQuery.includes('why')) {
      type = 'explanation';
      expectedContentTypes.push('explanation', 'theory');
    } else if (lowerQuery.includes('example') || lowerQuery.includes('instance') || lowerQuery.includes('demonstrate')) {
      type = 'example';
      expectedContentTypes.push('example', 'practice');
    } else if (lowerQuery.includes('difference') || lowerQuery.includes('compare') || lowerQuery.includes('versus')) {
      type = 'comparison';
      expectedContentTypes.push('comparison', 'explanation');
    } else if (lowerQuery.includes('how to') || lowerQuery.includes('steps') || lowerQuery.includes('implement')) {
      type = 'how-to';
      expectedContentTypes.push('practice', 'example', 'steps');
    }

    // Extract key concepts using NLP-like patterns
    const concepts = this.extractConcepts(query);
    const keywords = this.extractEnhancedKeywords(query);

    return {
      type,
      keywords,
      concepts,
      expectedContentTypes,
    };
  }

  /**
   * Perform intent-aware search with improved accuracy
   */
  async searchWithIntent(
    query: string,
    userId: string,
    options: any = {}
  ): Promise<any> {
    // Analyze query intent
    const intent = await this.analyzeQueryIntent(query);
    
    logger.info('[SearchAccuracy] Query intent analysis:', {
      query,
      intent,
    });

    // Adjust search parameters based on intent
    const searchOptions = this.optimizeSearchForIntent(intent, options);

    // Perform enhanced search
    const results = await this.enhancedSearch.semanticSearch(
      query,
      userId,
      searchOptions
    );

    // Post-process results based on intent
    const improvedResults = await this.postProcessResults(results, intent, query);

    // Calculate and log metrics
    const metrics = this.calculateSearchMetrics(improvedResults, intent);
    logger.info('[SearchAccuracy] Search metrics:', metrics);

    return {
      ...improvedResults,
      intent,
      metrics,
    };
  }

  /**
   * Optimize search parameters based on query intent
   */
  private optimizeSearchForIntent(intent: QueryIntent, baseOptions: any): any {
    const options = { ...baseOptions };

    switch (intent.type) {
      case 'definition':
        options.weightVector = 0.6;
        options.weightKeyword = 0.4;
        options.filters = {
          ...options.filters,
          contentTypes: intent.expectedContentTypes,
          importance: ['high', 'medium'],
        };
        options.limit = 5;
        break;

      case 'explanation':
        options.weightVector = 0.8;
        options.weightKeyword = 0.2;
        options.semanticBoost = true;
        options.contextWindow = 5;
        options.limit = 10;
        break;

      case 'example':
        options.weightVector = 0.7;
        options.weightKeyword = 0.3;
        options.filters = {
          ...options.filters,
          contentTypes: intent.expectedContentTypes,
        };
        options.diversityFactor = 0.4;
        break;

      case 'comparison':
        options.weightVector = 0.75;
        options.weightKeyword = 0.25;
        options.diversityFactor = 0.5;
        options.limit = 15;
        break;

      case 'how-to':
        options.weightVector = 0.5;
        options.weightKeyword = 0.5;
        options.filters = {
          ...options.filters,
          contentTypes: ['practice', 'example', 'steps'],
        };
        options.rerank = true;
        break;

      default:
        options.weightVector = 0.7;
        options.weightKeyword = 0.3;
        options.semanticBoost = true;
    }

    return options;
  }

  /**
   * Post-process results to improve accuracy
   */
  private async postProcessResults(
    results: any,
    intent: QueryIntent,
    query: string
  ): Promise<any> {
    let processedResults = [...results.results];

    // 1. Filter by intent-specific criteria
    if (intent.expectedContentTypes.length > 0) {
      processedResults = this.boostByContentType(
        processedResults,
        intent.expectedContentTypes
      );
    }

    // 2. Concept matching boost
    if (intent.concepts.length > 0) {
      processedResults = this.boostByConceptMatch(
        processedResults,
        intent.concepts
      );
    }

    // 3. Re-rank based on query-specific relevance
    processedResults = await this.rerankByRelevance(
      processedResults,
      query,
      intent
    );

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
    return results.map(result => {
      if (expectedTypes.includes(result.metadata.contentType)) {
        result.score *= 1.2;
        result.intentMatch = true;
      }
      return result;
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Boost results that contain query concepts
   */
  private boostByConceptMatch(results: any[], concepts: string[]): any[] {
    return results.map(result => {
      const resultConcepts = result.metadata.concepts || [];
      const matchCount = concepts.filter(c => 
        resultConcepts.some((rc: string) => 
          rc.toLowerCase().includes(c.toLowerCase())
        )
      ).length;

      if (matchCount > 0) {
        result.score *= (1 + 0.1 * matchCount);
        result.conceptMatches = matchCount;
      }

      return result;
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Re-rank results based on deep relevance analysis
   */
  private async rerankByRelevance(
    results: any[],
    query: string,
    intent: QueryIntent
  ): Promise<any[]> {
    // Calculate relevance scores
    const relevanceScores = await Promise.all(
      results.map(async (result) => {
        let relevance = 0;

        // Title/section relevance
        if (result.metadata.sectionTitle) {
          const sectionRelevance = this.calculateTextSimilarity(
            query,
            result.metadata.sectionTitle
          );
          relevance += sectionRelevance * 0.2;
        }

        // Keyword density
        const keywordDensity = this.calculateKeywordDensity(
          result.content,
          intent.keywords
        );
        relevance += keywordDensity * 0.3;

        // Structure bonus (for well-structured content)
        if (result.metadata.hierarchyLevel <= 2) {
          relevance += 0.1;
        }

        // Intent alignment
        if (result.intentMatch) {
          relevance += 0.2;
        }

        return {
          ...result,
          relevanceScore: relevance,
          finalScore: result.score * 0.7 + relevance * 0.3,
        };
      })
    );

    return relevanceScores.sort((a, b) => b.finalScore - a.finalScore);
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
   * Extract concepts from query using enhanced NLP
   */
  private extractConcepts(query: string): string[] {
    const concepts: string[] = [];
    
    // Common ML/AI concepts (expand this list based on your domain)
    const knownConcepts = [
      'machine learning', 'neural network', 'deep learning',
      'artificial intelligence', 'algorithm', 'optimization',
      'gradient descent', 'backpropagation', 'training',
      'model', 'dataset', 'feature', 'classification',
      'regression', 'clustering', 'supervised learning',
      'unsupervised learning', 'reinforcement learning',
    ];

    const lowerQuery = query.toLowerCase();
    knownConcepts.forEach(concept => {
      if (lowerQuery.includes(concept)) {
        concepts.push(concept);
      }
    });

    // Extract noun phrases (simplified)
    const words = query.split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`.toLowerCase();
      if (!concepts.includes(bigram) && this.isLikelyNounPhrase(bigram)) {
        concepts.push(bigram);
      }
    }

    return [...new Set(concepts)];
  }

  /**
   * Enhanced keyword extraction
   */
  private extractEnhancedKeywords(query: string): string[] {
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for',
      'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on',
      'that', 'the', 'to', 'was', 'will', 'with', 'what', 'when',
      'where', 'who', 'why', 'how', 'can', 'could', 'should',
      'would', 'does', 'do', 'did', 'explain', 'show', 'tell',
    ]);

    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Add stemmed versions (simplified)
    const keywords = new Set(words);
    words.forEach(word => {
      if (word.endsWith('ing')) {
        keywords.add(word.slice(0, -3));
      } else if (word.endsWith('ed')) {
        keywords.add(word.slice(0, -2));
      } else if (word.endsWith('s') && word.length > 3) {
        keywords.add(word.slice(0, -1));
      }
    });

    return Array.from(keywords);
  }

  /**
   * Calculate text similarity score
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate keyword density in content
   */
  private calculateKeywordDensity(content: string, keywords: string[]): number {
    const lowerContent = content.toLowerCase();
    const contentWords = lowerContent.split(/\s+/).length;
    
    let keywordCount = 0;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) {
        keywordCount += matches.length;
      }
    });

    return Math.min(keywordCount / contentWords, 0.1) * 10; // Normalize to 0-1
  }

  /**
   * Check if a phrase is likely a noun phrase
   */
  private isLikelyNounPhrase(phrase: string): boolean {
    const words = phrase.split(' ');
    if (words.length !== 2) return false;
    
    // Simple heuristic: avoid phrases starting with verbs
    const verbStarts = ['is', 'are', 'was', 'were', 'have', 'has', 'had'];
    return !verbStarts.includes(words[0]);
  }

  /**
   * Calculate search quality metrics
   */
  private calculateSearchMetrics(results: any, intent: QueryIntent): SearchMetrics {
    const topResults = results.results.slice(0, 10);
    
    // Precision: How many results match the intent
    const relevantCount = topResults.filter((r: any) => 
      r.intentMatch || r.relevanceScore > 0.7
    ).length;
    const precision = topResults.length > 0 ? relevantCount / topResults.length : 0;

    // Recall estimate (simplified)
    const expectedResults = Math.min(intent.keywords.length * 2, 10);
    const recall = relevantCount / expectedResults;

    // F1 Score
    const f1Score = precision + recall > 0 
      ? 2 * (precision * recall) / (precision + recall)
      : 0;

    // Average relevance score
    const avgRelevance = topResults.reduce((sum: number, r: any) => 
      sum + (r.relevanceScore || r.score), 0
    ) / Math.max(topResults.length, 1);

    // Diversity score
    const uniqueSections = new Set(topResults.map((r: any) => r.metadata.sectionTitle));
    const uniqueTypes = new Set(topResults.map((r: any) => r.metadata.contentType));
    const diversityScore = (uniqueSections.size + uniqueTypes.size) / (topResults.length * 2);

    return {
      precision,
      recall,
      f1Score,
      relevanceScore: avgRelevance,
      diversityScore,
    };
  }

  /**
   * Learn from user feedback to improve accuracy
   */
  async learnFromFeedback(
    searchId: string,
    clickedResults: string[],
    userId: string
  ): Promise<void> {
    try {
      // Store feedback for future improvements
      const feedback = {
        search_id: searchId,
        user_id: userId,
        clicked_results: clickedResults,
        timestamp: new Date().toISOString(),
      };

      await supabase
        .from('search_feedback')
        .insert(feedback);

      logger.info('[SearchAccuracy] Feedback recorded:', {
        searchId,
        clickedCount: clickedResults.length,
      });
    } catch (error) {
      logger.error('[SearchAccuracy] Failed to record feedback:', error);
    }
  }
}