import { HybridSearchService } from './HybridSearchService';
import { SearchOptions, SearchResult, SearchResponse } from './types';
import { supabase } from '../../config/supabase';

interface SemanticSearchOptions extends SearchOptions {
  semanticBoost?: boolean;
  contextWindow?: number;
  rerank?: boolean;
  diversityFactor?: number;
}

interface EnhancedSearchResult extends SearchResult {
  semanticScore?: number;
  contextualRelevance?: number;
  diversityScore?: number;
}

export class EnhancedSearchService extends HybridSearchService {
  constructor() {
    super();
  }

  async search(
    query: string,
    userId: string,
    options: SemanticSearchOptions = {}
  ): Promise<SearchResponse> {
    // Convert SemanticSearchOptions to SearchOptions
    const searchOptions: SearchOptions = {
      limit: options.limit,
      offset: options.offset,
      threshold: options.threshold,
      searchType: options.searchType,
      filters: options.filters,
      weightVector: options.weightVector,
      weightKeyword: options.weightKeyword,
      includeContent: options.includeContent,
      highlightMatches: options.highlightMatches,
    };

    const enhancedOptions = {
      ...searchOptions,
      semanticBoost: options.semanticBoost ?? true,
      contextWindow: options.contextWindow ?? 3,
      rerank: options.rerank ?? true,
      diversityFactor: options.diversityFactor ?? 0.3,
    };

    // Get initial results from hybrid search
    const initialResults = await super.search(query, userId, searchOptions);

    if (!enhancedOptions.semanticBoost) {
      return initialResults;
    }

    // Apply semantic enhancements
    let enhancedResults = initialResults.results as EnhancedSearchResult[];

    // 1. Context-aware reranking
    if (enhancedOptions.rerank) {
      enhancedResults = await this.semanticRerank(query, enhancedResults, enhancedOptions);
    }

    // 2. Add diversity to results
    if (enhancedOptions.diversityFactor && enhancedOptions.diversityFactor > 0) {
      enhancedResults = this.addDiversity(enhancedResults, enhancedOptions.diversityFactor);
    }

    // 3. Calculate final semantic scores
    enhancedResults = enhancedResults.map((result: SearchResult) => ({
      ...result,
      semanticScore: result.score,
    })) as EnhancedSearchResult[];

    return {
      ...initialResults,
      results: enhancedResults,
    };
  }

  private async semanticRerank(
    _query: string,
    results: EnhancedSearchResult[],
    options: SemanticSearchOptions
  ): Promise<EnhancedSearchResult[]> {
    // Note: We could use query embedding for semantic similarity scoring in the future

    // Build context window
    const contextualResults = await this.buildContextWindows(results, options.contextWindow || 3);

    // Calculate semantic relevance scores
    const rerankedResults = contextualResults.map((result: SearchResult) => {
      const semanticBoost = this.calculateSemanticBoost(result);

      return {
        ...result,
        score: result.score * semanticBoost,
        semanticScore: semanticBoost,
      } as EnhancedSearchResult;
    });

    return rerankedResults.sort((a: SearchResult, b: SearchResult) => b.score - a.score);
  }

  private async buildContextWindows(
    results: EnhancedSearchResult[],
    _contextWindow: number
  ): Promise<EnhancedSearchResult[]> {
    // Group results by file
    const fileGroups = new Map<string, EnhancedSearchResult[]>();
    results.forEach((result: SearchResult) => {
      if (!fileGroups.has(result.fileId)) {
        fileGroups.set(result.fileId, []);
      }
      fileGroups.get(result.fileId)!.push(result as EnhancedSearchResult);
    });

    // Calculate contextual relevance
    const contextualResults = results.map((result: SearchResult) => {
      const fileResults = fileGroups.get(result.fileId) || [];
      let contextualRelevance = 1.0;

      // Boost results from same file
      const fileScore = fileResults.length > 1 ? 1.1 : 1.0;

      contextualRelevance = fileScore;

      return {
        ...result,
        contextualRelevance,
      } as EnhancedSearchResult;
    });

    return contextualResults;
  }

  private addDiversity(
    results: EnhancedSearchResult[],
    diversityFactor: number
  ): EnhancedSearchResult[] {
    const seenFiles = new Set<string>();
    const diverseResults: EnhancedSearchResult[] = [];

    // First pass: add top results from unique files
    for (const result of results) {
      if (!seenFiles.has(result.fileId)) {
        seenFiles.add(result.fileId);
        diverseResults.push(result);
      }
    }

    // Second pass: add remaining results with diversity penalty
    for (const result of results) {
      if (!diverseResults.includes(result)) {
        const boost = this.calculateSemanticBoost(result);
        const diversityPenalty = 1 - diversityFactor;

        diverseResults.push({
          ...result,
          score: result.score * boost * diversityPenalty,
          diversityScore: diversityPenalty,
        });
      }
    }

    return diverseResults.sort((a: SearchResult, b: SearchResult) => b.score - a.score);
  }

  private calculateSemanticBoost(result: SearchResult): number {
    let boost = 1.0;

    // Boost based on content type
    if (['heading', 'summary'].includes(result.metadata.contentType)) {
      boost *= 1.15;
    }

    // Boost based on importance
    if (result.metadata.importance === 'high') {
      boost *= 1.1;
    }

    // Consider context
    if (result.metadata.chunkIndex !== undefined) {
      boost *= 1.05;
    }

    return boost;
  }

  // Enhanced search with semantic clustering
  async searchWithClusters(
    query: string,
    userId: string,
    options: SemanticSearchOptions = {}
  ): Promise<{
    results: SearchResult[];
    clusters: Array<{
      topic: string;
      results: SearchResult[];
      confidence: number;
    }>;
    totalCount: number;
  }> {
    const searchResults = await this.search(query, userId, options);

    // Cluster results by semantic similarity
    const clusters = await this.clusterResults(searchResults.results, query);

    return {
      results: searchResults.results,
      clusters,
      totalCount: searchResults.totalCount,
    };
  }

  private async clusterResults(
    results: SearchResult[],
    _query: string
  ): Promise<
    Array<{
      topic: string;
      results: SearchResult[];
      confidence: number;
    }>
  > {
    // Simple clustering by content type and importance
    const clusters = new Map<string, SearchResult[]>();

    results.forEach((result: SearchResult) => {
      const key = `${result.metadata.contentType}-${result.metadata.importance}`;
      if (!clusters.has(key)) {
        clusters.set(key, []);
      }
      clusters.get(key)!.push(result);
    });

    return Array.from(clusters.entries()).map(([key, clusterResults]) => ({
      topic: key,
      results: clusterResults,
      confidence: clusterResults.length / results.length,
    }));
  }

  // Semantic query expansion
  async searchWithExpansion(
    query: string,
    userId: string,
    options: SemanticSearchOptions = {}
  ): Promise<SearchResponse> {
    // Get expanded query terms
    const expandedTerms = await this.expandQuery(query);
    const expandedQuery = [query, ...expandedTerms].join(' ');

    // Perform search with expanded query
    return this.search(expandedQuery, userId, options);
  }

  private async expandQuery(query: string): Promise<string[]> {
    try {
      // Get related terms from the knowledge base
      const { data } = await supabase
        .from('semantic_chunks')
        .select('keywords, concepts')
        .textSearch('content', query, {
          type: 'websearch',
          config: 'english',
        })
        .limit(10);

      if (!data) return [];

      const relatedTerms = new Set<string>();
      data.forEach((item: any) => {
        if (item.keywords) {
          JSON.parse(item.keywords).forEach((keyword: string) => {
            if (keyword.toLowerCase() !== query.toLowerCase()) {
              relatedTerms.add(keyword);
            }
          });
        }
        if (item.concepts) {
          JSON.parse(item.concepts).forEach((concept: string) => {
            if (concept.toLowerCase() !== query.toLowerCase()) {
              relatedTerms.add(concept);
            }
          });
        }
      });

      return Array.from(relatedTerms).slice(0, 3); // Top 3 related terms
    } catch (error) {
      return [];
    }
  }
}
