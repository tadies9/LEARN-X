import { VectorSearchResult, VectorSearchOptions } from '../interfaces/IVectorStore';
import { supabase } from '../../../config/supabase';
import { logger } from '../../../utils/logger';

export interface HybridSearchConfig {
  vectorWeight: number;
  keywordWeight: number;
  fusionMethod: 'rrf' | 'linear' | 'harmonic' | 'convex';
  rerankingEnabled: boolean;
  keywordExpansion: boolean;
  semanticDrift: number; // How much to allow semantic drift in results
}

export interface HybridSearchResult extends VectorSearchResult {
  vectorScore: number;
  keywordScore: number;
  fusedScore: number;
  rankPosition: number;
}

export interface QueryAnalysis {
  hasKeywords: boolean;
  hasNaturalLanguage: boolean;
  keywordDensity: number;
  queryType: 'semantic' | 'keyword' | 'hybrid';
  suggestedWeights: {
    vector: number;
    keyword: number;
  };
}

export class HybridSearchOptimizer {
  private config: HybridSearchConfig;

  constructor(config: Partial<HybridSearchConfig> = {}) {
    this.config = {
      vectorWeight: 0.7,
      keywordWeight: 0.3,
      fusionMethod: 'rrf',
      rerankingEnabled: true,
      keywordExpansion: true,
      semanticDrift: 0.3,
      ...config,
    };
  }

  /**
   * Perform optimized hybrid search
   */
  async optimizedHybridSearch(
    queryText: string,
    queryVector: number[],
    options: VectorSearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    try {
      // Analyze query to optimize weights
      const queryAnalysis = this.analyzeQuery(queryText);
      const adaptedConfig = this.adaptConfigForQuery(queryAnalysis);

      logger.debug('[HybridOptimizer] Query analysis', {
        queryType: queryAnalysis.queryType,
        adaptedWeights: {
          vector: adaptedConfig.vectorWeight,
          keyword: adaptedConfig.keywordWeight,
        },
      });

      // Perform vector search
      const vectorResults = await this.performVectorSearch(queryVector, options);

      // Perform keyword search
      const keywordResults = await this.performKeywordSearch(
        queryText,
        options,
        adaptedConfig.keywordExpansion
      );

      // Fuse results
      const fusedResults = this.fuseResults(vectorResults, keywordResults, adaptedConfig);

      // Apply reranking if enabled
      if (adaptedConfig.rerankingEnabled) {
        return this.rerankResults(fusedResults, queryText, queryVector);
      }

      return fusedResults;
    } catch (error) {
      logger.error('[HybridOptimizer] Search failed:', error);
      throw error;
    }
  }

  /**
   * Analyze query characteristics
   */
  analyzeQuery(query: string): QueryAnalysis {
    const words = query.toLowerCase().split(/\s+/);
    const totalWords = words.length;

    // Detect keyword patterns
    const keywordPatterns = [
      /^\w+:\w+/, // field:value patterns
      /["'].*["']/, // quoted phrases
      /AND|OR|NOT/i, // boolean operators
      /\+\w+|-\w+/, // inclusion/exclusion operators
    ];

    const hasKeywordPatterns = keywordPatterns.some((pattern) => pattern.test(query));

    // Calculate keyword density
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'about',
    ]);
    const contentWords = words.filter((word) => !stopWords.has(word));
    const keywordDensity = contentWords.length / totalWords;

    // Determine query type
    let queryType: 'semantic' | 'keyword' | 'hybrid';
    if (hasKeywordPatterns || keywordDensity > 0.8) {
      queryType = 'keyword';
    } else if (totalWords > 10 && keywordDensity < 0.5) {
      queryType = 'semantic';
    } else {
      queryType = 'hybrid';
    }

    // Suggest optimal weights based on analysis
    let suggestedWeights: { vector: number; keyword: number };
    switch (queryType) {
      case 'semantic':
        suggestedWeights = { vector: 0.8, keyword: 0.2 };
        break;
      case 'keyword':
        suggestedWeights = { vector: 0.3, keyword: 0.7 };
        break;
      default:
        suggestedWeights = { vector: 0.6, keyword: 0.4 };
    }

    return {
      hasKeywords: hasKeywordPatterns,
      hasNaturalLanguage: !hasKeywordPatterns && totalWords > 3,
      keywordDensity,
      queryType,
      suggestedWeights,
    };
  }

  /**
   * Adapt configuration based on query analysis
   */
  private adaptConfigForQuery(analysis: QueryAnalysis): HybridSearchConfig {
    const adaptedConfig = { ...this.config };

    // Adjust weights based on query type
    if (analysis.queryType === 'semantic') {
      adaptedConfig.vectorWeight = Math.max(0.7, adaptedConfig.vectorWeight);
      adaptedConfig.keywordWeight = 1 - adaptedConfig.vectorWeight;
    } else if (analysis.queryType === 'keyword') {
      adaptedConfig.keywordWeight = Math.max(0.6, adaptedConfig.keywordWeight);
      adaptedConfig.vectorWeight = 1 - adaptedConfig.keywordWeight;
    }

    // Enable keyword expansion for natural language queries
    adaptedConfig.keywordExpansion = analysis.hasNaturalLanguage;

    return adaptedConfig;
  }

  /**
   * Perform vector search
   */
  private async performVectorSearch(
    queryVector: number[],
    options: VectorSearchOptions
  ): Promise<Array<VectorSearchResult & { vectorScore: number }>> {
    try {
      // This would integrate with your existing vector search
      // For now, we'll simulate the search
      const vectorSearchQuery = `
        SELECT 
          fc.id,
          fc.content,
          fc.file_id,
          fe.embedding,
          1 - (fe.embedding <=> $1::vector) as similarity
        FROM file_chunks fc
        JOIN file_embeddings fe ON fe.chunk_id = fc.id
        WHERE 1 - (fe.embedding <=> $1::vector) >= $2
        ORDER BY fe.embedding <=> $1::vector
        LIMIT $3
      `;

      const embeddingStr = `[${queryVector.join(',')}]`;
      const threshold = options.threshold || 0.7;
      const limit = options.topK || 10;

      const { data, error } = await supabase.rpc('exec_sql_return', {
        query: vectorSearchQuery
          .replace('$1', `'${embeddingStr}'`)
          .replace('$2', threshold.toString())
          .replace('$3', limit.toString()),
      });

      if (error) {
        throw error;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        score: row.similarity,
        vectorScore: row.similarity,
        metadata: {
          fileId: row.file_id,
        },
        content: row.content,
      }));
    } catch (error) {
      logger.error('[HybridOptimizer] Vector search failed:', error);
      return [];
    }
  }

  /**
   * Perform keyword search with optional expansion
   */
  private async performKeywordSearch(
    query: string,
    options: VectorSearchOptions,
    expandKeywords: boolean = false
  ): Promise<Array<VectorSearchResult & { keywordScore: number }>> {
    try {
      let searchQuery = query;

      // Expand keywords if enabled
      if (expandKeywords) {
        searchQuery = this.expandKeywords(query);
      }

      // Use PostgreSQL full-text search
      const keywordSearchQuery = `
        SELECT 
          fc.id,
          fc.content,
          fc.file_id,
          ts_rank(to_tsvector('english', fc.content), plainto_tsquery('english', $1)) as keyword_score
        FROM file_chunks fc
        WHERE to_tsvector('english', fc.content) @@ plainto_tsquery('english', $1)
        ORDER BY keyword_score DESC
        LIMIT $2
      `;

      const limit = options.topK || 10;

      const { data, error } = await supabase.rpc('exec_sql_return', {
        query: keywordSearchQuery.replace('$1', `'${searchQuery}'`).replace('$2', limit.toString()),
      });

      if (error) {
        throw error;
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        score: row.keyword_score,
        keywordScore: row.keyword_score,
        metadata: {
          fileId: row.file_id,
        },
        content: row.content,
      }));
    } catch (error) {
      logger.error('[HybridOptimizer] Keyword search failed:', error);
      return [];
    }
  }

  /**
   * Expand keywords using synonyms and related terms
   */
  private expandKeywords(query: string): string {
    // Simple keyword expansion - in practice, you'd use a thesaurus or word embeddings
    const expansions: Record<string, string[]> = {
      'machine learning': ['ML', 'artificial intelligence', 'AI', 'neural networks'],
      'deep learning': ['neural networks', 'AI', 'machine learning'],
      database: ['DB', 'data store', 'repository'],
      algorithm: ['method', 'procedure', 'technique'],
      programming: ['coding', 'development', 'software'],
    };

    let expandedQuery = query;

    Object.entries(expansions).forEach(([term, synonyms]) => {
      if (query.toLowerCase().includes(term)) {
        expandedQuery += ' ' + synonyms.join(' ');
      }
    });

    return expandedQuery;
  }

  /**
   * Fuse vector and keyword search results
   */
  private fuseResults(
    vectorResults: Array<VectorSearchResult & { vectorScore: number }>,
    keywordResults: Array<VectorSearchResult & { keywordScore: number }>,
    config: HybridSearchConfig
  ): HybridSearchResult[] {
    // Create a map to merge results by ID
    const resultMap = new Map<string, HybridSearchResult>();

    // Add vector results
    vectorResults.forEach((result, index) => {
      resultMap.set(result.id, {
        ...result,
        vectorScore: result.vectorScore,
        keywordScore: 0,
        fusedScore: 0,
        rankPosition: index + 1,
      });
    });

    // Merge with keyword results
    keywordResults.forEach((result, index) => {
      const existing = resultMap.get(result.id);
      if (existing) {
        existing.keywordScore = result.keywordScore;
      } else {
        resultMap.set(result.id, {
          ...result,
          vectorScore: 0,
          keywordScore: result.keywordScore,
          fusedScore: 0,
          rankPosition: index + 1,
        });
      }
    });

    // Calculate fused scores
    const results = Array.from(resultMap.values());
    this.calculateFusedScores(results, config);

    // Sort by fused score
    results.sort((a, b) => b.fusedScore - a.fusedScore);

    // Update rank positions
    results.forEach((result, index) => {
      result.rankPosition = index + 1;
    });

    return results;
  }

  /**
   * Calculate fused scores using specified fusion method
   */
  private calculateFusedScores(results: HybridSearchResult[], config: HybridSearchConfig): void {
    switch (config.fusionMethod) {
      case 'linear':
        this.linearFusion(results, config);
        break;
      case 'rrf':
        this.reciprocalRankFusion(results, config);
        break;
      case 'harmonic':
        this.harmonicFusion(results, config);
        break;
      case 'convex':
        this.convexFusion(results, config);
        break;
      default:
        this.linearFusion(results, config);
    }
  }

  /**
   * Linear weighted fusion
   */
  private linearFusion(results: HybridSearchResult[], config: HybridSearchConfig): void {
    results.forEach((result) => {
      result.fusedScore =
        config.vectorWeight * result.vectorScore + config.keywordWeight * result.keywordScore;
    });
  }

  /**
   * Reciprocal Rank Fusion (RRF)
   */
  private reciprocalRankFusion(results: HybridSearchResult[], config: HybridSearchConfig): void {
    const k = 60; // RRF constant

    // Sort by vector score to get vector ranks
    const vectorRanked = [...results].sort((a, b) => b.vectorScore - a.vectorScore);
    const vectorRanks = new Map(vectorRanked.map((result, index) => [result.id, index + 1]));

    // Sort by keyword score to get keyword ranks
    const keywordRanked = [...results].sort((a, b) => b.keywordScore - a.keywordScore);
    const keywordRanks = new Map(keywordRanked.map((result, index) => [result.id, index + 1]));

    results.forEach((result) => {
      const vectorRank = vectorRanks.get(result.id) || results.length + 1;
      const keywordRank = keywordRanks.get(result.id) || results.length + 1;

      result.fusedScore =
        config.vectorWeight / (k + vectorRank) + config.keywordWeight / (k + keywordRank);
    });
  }

  /**
   * Harmonic mean fusion
   */
  private harmonicFusion(results: HybridSearchResult[], config: HybridSearchConfig): void {
    results.forEach((result) => {
      if (result.vectorScore > 0 && result.keywordScore > 0) {
        result.fusedScore =
          2 /
          (config.vectorWeight / result.vectorScore + config.keywordWeight / result.keywordScore);
      } else {
        result.fusedScore = result.vectorScore + result.keywordScore;
      }
    });
  }

  /**
   * Convex combination with adaptive weights
   */
  private convexFusion(results: HybridSearchResult[], config: HybridSearchConfig): void {
    results.forEach((result) => {
      // Adaptive weights based on score confidence
      const vectorConfidence = result.vectorScore;
      const keywordConfidence = result.keywordScore;
      const totalConfidence = vectorConfidence + keywordConfidence;

      if (totalConfidence > 0) {
        const adaptiveVectorWeight = (vectorConfidence / totalConfidence) * config.vectorWeight;
        const adaptiveKeywordWeight = (keywordConfidence / totalConfidence) * config.keywordWeight;

        result.fusedScore =
          adaptiveVectorWeight * result.vectorScore + adaptiveKeywordWeight * result.keywordScore;
      } else {
        result.fusedScore = 0;
      }
    });
  }

  /**
   * Rerank results using additional signals
   */
  private rerankResults(
    results: HybridSearchResult[],
    _query: string,
    _queryVector: number[]
  ): HybridSearchResult[] {
    // Apply additional ranking signals
    results.forEach((result) => {
      let rerankingBoost = 1.0;

      // Boost based on content quality indicators
      if (result.content) {
        // Boost longer, more detailed content
        const contentLength = result.content.length;
        if (contentLength > 500) {
          rerankingBoost *= 1.1;
        }

        // Boost content with structured information
        if (this.hasStructuredContent(result.content)) {
          rerankingBoost *= 1.05;
        }

        // Boost recent content
        if (result.metadata?.timestamp) {
          const timestamp = result.metadata.timestamp;
          const date = timestamp instanceof Date ? timestamp : new Date(String(timestamp));
          if (!isNaN(date.getTime())) {
            const age = Date.now() - date.getTime();
            const daysSinceCreation = age / (1000 * 60 * 60 * 24);
            if (daysSinceCreation < 30) {
              rerankingBoost *= 1.02;
            }
          }
        }
      }

      // Apply diversity penalty for very similar results
      const diversityPenalty = this.calculateDiversityPenalty(result, results);
      rerankingBoost *= diversityPenalty;

      result.fusedScore *= rerankingBoost;
    });

    // Re-sort after reranking
    results.sort((a, b) => b.fusedScore - a.fusedScore);

    // Update rank positions
    results.forEach((result, index) => {
      result.rankPosition = index + 1;
    });

    return results;
  }

  /**
   * Check if content has structured information
   */
  private hasStructuredContent(content: string): boolean {
    const structureIndicators = [
      /\d+\./, // Numbered lists
      /[-*]\s/, // Bullet points
      /#{1,6}\s/, // Headers
      /```/, // Code blocks
      /\|.*\|/, // Tables
    ];

    return structureIndicators.some((pattern) => pattern.test(content));
  }

  /**
   * Calculate diversity penalty to avoid over-clustering similar results
   */
  private calculateDiversityPenalty(
    result: HybridSearchResult,
    allResults: HybridSearchResult[]
  ): number {
    // Simple diversity penalty based on content similarity
    let penalty = 1.0;

    const higherRankedResults = allResults.filter(
      (r) => r.rankPosition < result.rankPosition && r.fusedScore > result.fusedScore
    );

    for (const other of higherRankedResults) {
      if (this.calculateContentSimilarity(result.content || '', other.content || '') > 0.8) {
        penalty *= 0.95; // 5% penalty for each very similar result
      }
    }

    return Math.max(penalty, 0.7); // Minimum 70% of original score
  }

  /**
   * Calculate simple content similarity
   */
  private calculateContentSimilarity(content1: string, content2: string): number {
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((word) => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Get optimization suggestions based on search performance
   */
  getOptimizationSuggestions(query: string, results: HybridSearchResult[]): string[] {
    const suggestions: string[] = [];
    const analysis = this.analyzeQuery(query);

    // Analyze result quality
    const avgVectorScore = results.reduce((sum, r) => sum + r.vectorScore, 0) / results.length;
    const avgKeywordScore = results.reduce((sum, r) => sum + r.keywordScore, 0) / results.length;

    if (avgVectorScore < 0.5 && analysis.queryType === 'semantic') {
      suggestions.push('Consider increasing vector weight for better semantic matching');
    }

    if (avgKeywordScore < 0.1 && analysis.queryType === 'keyword') {
      suggestions.push('Consider expanding keywords or improving keyword extraction');
    }

    if (results.length < 5) {
      suggestions.push('Consider lowering similarity threshold or expanding search scope');
    }

    const diversityScore = this.calculateResultDiversity(results);
    if (diversityScore < 0.3) {
      suggestions.push('Results show low diversity - consider adjusting fusion method or weights');
    }

    return suggestions;
  }

  /**
   * Calculate overall diversity of results
   */
  private calculateResultDiversity(results: HybridSearchResult[]): number {
    if (results.length < 2) return 1.0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const similarity = this.calculateContentSimilarity(
          results[i].content || '',
          results[j].content || ''
        );
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    const avgSimilarity = totalSimilarity / comparisons;
    return 1 - avgSimilarity; // Diversity is inverse of similarity
  }
}

// Export singleton instance
export const hybridSearchOptimizer = new HybridSearchOptimizer();
