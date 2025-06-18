import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { VectorEmbeddingService } from '../embeddings/VectorEmbeddingService';
import { AdvancedSearchOperations } from './AdvancedSearchOperations';
import { FacetManager } from './FacetManager';
import { SearchCacheManager, QueryProcessor, SearchRanker } from './SearchUtilities';
import { SearchOptions, SearchFilters, SearchResult, SearchResponse } from './types';

export class HybridSearchService {
  private embeddingService: VectorEmbeddingService;
  private advancedOps: AdvancedSearchOperations;
  private facetManager: FacetManager;
  private cacheManager: SearchCacheManager;
  private queryProcessor: QueryProcessor;
  private searchRanker: SearchRanker;

  constructor() {
    this.embeddingService = new VectorEmbeddingService();
    this.advancedOps = new AdvancedSearchOperations();
    this.facetManager = new FacetManager();
    this.cacheManager = new SearchCacheManager();
    this.queryProcessor = new QueryProcessor();
    this.searchRanker = new SearchRanker();
  }

  async search(
    query: string,
    userId: string,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    // Set default options
    const opts: Required<SearchOptions> = {
      limit: options.limit || 10,
      offset: options.offset || 0,
      threshold: options.threshold || 0.7,
      searchType: options.searchType || 'hybrid',
      filters: options.filters || {},
      weightVector: options.weightVector ?? 0.7,
      weightKeyword: options.weightKeyword ?? 0.3,
      includeContent: options.includeContent ?? true,
      highlightMatches: options.highlightMatches ?? true,
    };

    // Check cache
    const cacheKey = this.cacheManager.generateCacheKey(query, userId, opts);
    const cached = await this.cacheManager.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        cached: true,
        searchTime: Date.now() - startTime,
      };
    }

    logger.info('[HybridSearch] Performing search', {
      query,
      userId,
      searchType: opts.searchType,
    });

    // Process query
    const processedQuery = this.queryProcessor.preprocessQuery(query);
    const keywords = this.queryProcessor.extractKeywords(processedQuery);

    let results: SearchResult[] = [];

    // Perform search based on type
    switch (opts.searchType) {
      case 'vector':
        results = await this.vectorSearch(processedQuery, opts);
        break;
      case 'keyword':
        results = await this.keywordSearch(keywords, userId, opts);
        break;
      case 'hybrid':
        results = await this.hybridSearch(processedQuery, keywords, userId, opts);
        break;
    }

    // Apply post-processing
    results = this.searchRanker.rankResults(results, opts);

    if (opts.highlightMatches) {
      results = this.highlightResults(results, keywords);
    }

    if (opts.includeContent) {
      results = await this.enrichWithContext(results);
    }

    // Get total count
    const totalCount = await this.getTotalCount(userId, opts.filters);

    const response: SearchResponse = {
      results: results.slice(opts.offset, opts.offset + opts.limit),
      totalCount,
      searchTime: Date.now() - startTime,
      cached: false,
      query: {
        original: query,
        processed: processedQuery,
        keywords,
        filters: opts.filters,
      },
    };

    // Cache the response
    await this.cacheManager.cacheResponse(cacheKey, response);

    return response;
  }

  // Delegate to advanced operations
  async getSuggestions(query: string, userId: string, limit?: number): Promise<string[]> {
    return this.advancedOps.getSuggestions(query, userId, limit);
  }

  async searchWithCustomScoring(
    query: string,
    userId: string,
    options: SearchOptions & {
      customScoring?: {
        recencyWeight?: number;
        popularityWeight?: number;
        personalRelevanceWeight?: number;
      };
    }
  ): Promise<SearchResult[]> {
    return this.advancedOps.searchWithCustomScoring(query, userId, options);
  }

  async searchWithFacets(query: string, userId: string, options: SearchOptions) {
    const searchResponse = await this.search(query, userId, options);
    return this.facetManager.searchWithFacets(query, userId, options, searchResponse.results);
  }

  private async vectorSearch(
    query: string,
    options: Required<SearchOptions>
  ): Promise<SearchResult[]> {
    // Generate embedding for query
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // Format embedding for PostgreSQL vector type
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Use the correct search_similar_chunks function
    const { data, error } = await supabase.rpc('search_similar_chunks', {
      query_embedding: embeddingStr,
      match_count: options.limit + options.offset,
      similarity_threshold: options.threshold,
    });

    if (error) {
      logger.error('[HybridSearch] Vector search error:', error);
      throw new Error('Vector search failed');
    }

    return this.transformSimilarChunksResults(data || []);
  }

  private async keywordSearch(
    keywords: string[],
    userId: string,
    options: Required<SearchOptions>
  ): Promise<SearchResult[]> {
    // Build keyword search query
    const searchPattern = keywords.join(' | ');

    let query = supabase
      .from('semantic_chunks')
      .select(
        `
        id,
        file_id,
        file_name,
        content,
        chunk_index,
        chunk_type,
        importance,
        section_title,
        concepts,
        keywords,
        course_id,
        module_id
      `
      )
      .textSearch('content', searchPattern, {
        type: 'websearch',
        config: 'english',
      });

    // Apply filters
    query = this.applyKeywordFilters(query, userId, options.filters);

    // Add limit and offset
    query = query
      .range(options.offset, options.offset + options.limit - 1)
      .order('chunk_index', { ascending: true });

    const { data, error } = await query;

    if (error) {
      logger.error('[HybridSearch] Keyword search error:', error);
      throw new Error('Keyword search failed');
    }

    return this.transformKeywordResults(data || [], keywords);
  }

  private async hybridSearch(
    query: string,
    keywords: string[],
    userId: string,
    options: Required<SearchOptions>
  ): Promise<SearchResult[]> {
    // Perform both searches in parallel
    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearch(query, options),
      this.keywordSearch(keywords, userId, options),
    ]);

    // Merge and deduplicate results
    const mergedResults = this.searchRanker.mergeResults(
      vectorResults,
      keywordResults,
      options.weightVector,
      options.weightKeyword
    );

    return mergedResults;
  }

  private highlightResults(results: SearchResult[], keywords: string[]): SearchResult[] {
    return results.map((result) => {
      const highlights: string[] = [];
      const content = result.content.toLowerCase();

      keywords.forEach((keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = content.match(regex);
        if (matches) {
          // Extract surrounding context
          const index = content.indexOf(keyword.toLowerCase());
          if (index !== -1) {
            const start = Math.max(0, index - 50);
            const end = Math.min(content.length, index + keyword.length + 50);
            const highlight = result.content.substring(start, end);
            highlights.push(highlight);
          }
        }
      });

      result.highlights = highlights;
      return result;
    });
  }

  private async enrichWithContext(results: SearchResult[]): Promise<SearchResult[]> {
    // Get context for each result (previous and next chunks)
    const enrichedResults = await Promise.all(
      results.map(async (result) => {
        const { data: contextChunks } = await supabase
          .from('file_chunks')
          .select('chunk_index, content')
          .eq('file_id', result.fileId)
          .in('chunk_index', [result.metadata.chunkIndex - 1, result.metadata.chunkIndex + 1]);

        if (contextChunks && contextChunks.length > 0) {
          const before = contextChunks.find(
            (c) => c.chunk_index === result.metadata.chunkIndex - 1
          );
          const after = contextChunks.find((c) => c.chunk_index === result.metadata.chunkIndex + 1);

          result.context = {
            before: before?.content.slice(-200), // Last 200 chars
            after: after?.content.slice(0, 200), // First 200 chars
          };
        }

        return result;
      })
    );

    return enrichedResults;
  }

  private applyKeywordFilters(query: any, _userId: string, filters: SearchFilters): any {
    // Similar to applyFilters but for keyword search
    // User access is handled through the view

    if (filters.courseId) {
      query = query.eq('course_id', filters.courseId);
    }

    if (filters.moduleId) {
      query = query.eq('module_id', filters.moduleId);
    }

    if (filters.fileId) {
      query = query.eq('file_id', filters.fileId);
    }

    if (filters.fileTypes && filters.fileTypes.length > 0) {
      query = query.in('mime_type', filters.fileTypes);
    }

    if (filters.contentTypes && filters.contentTypes.length > 0) {
      query = query.in('chunk_type', filters.contentTypes);
    }

    if (filters.importance && filters.importance.length > 0) {
      query = query.in('importance', filters.importance);
    }

    return query;
  }

  private transformSimilarChunksResults(data: any[]): SearchResult[] {
    return data.map((item) => ({
      id: item.chunk_id,
      fileId: item.file_id,
      fileName: 'Unknown', // Will be enriched later
      content: item.content,
      score: item.similarity,
      vectorScore: item.similarity,
      metadata: {
        chunkIndex: 0, // Not available in this function
        contentType: item.chunk_type || 'text',
        importance: 'medium', // Default
        sectionTitle: item.section_title,
        concepts: [],
        keywords: [],
      },
    }));
  }

  private transformKeywordResults(data: any[], keywords: string[]): SearchResult[] {
    return data.map((item) => {
      // Calculate keyword score based on matches
      const content = item.content.toLowerCase();
      let score = 0;
      keywords.forEach((keyword) => {
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
        const matches = content.match(regex);
        if (matches) {
          score += matches.length;
        }
      });

      // Normalize score
      const normalizedScore = Math.min(score / keywords.length / 10, 1);

      return {
        id: item.id,
        fileId: item.file_id,
        fileName: item.file_name,
        content: item.content,
        score: normalizedScore,
        keywordScore: normalizedScore,
        metadata: {
          chunkIndex: item.chunk_index,
          contentType: item.chunk_type,
          importance: item.importance,
          sectionTitle: item.section_title,
          concepts: item.concepts ? JSON.parse(item.concepts) : [],
          keywords: item.keywords ? JSON.parse(item.keywords) : [],
        },
      };
    });
  }

  private async getTotalCount(userId: string, filters: SearchFilters): Promise<number> {
    let query = supabase.from('semantic_chunks').select('id', { count: 'exact', head: true });

    query = this.applyKeywordFilters(query, userId, filters);

    const { count, error } = await query;

    if (error) {
      logger.error('[HybridSearch] Count query error:', error);
      return 0;
    }

    return count || 0;
  }

  async clearCache(userId?: string): Promise<void> {
    return this.cacheManager.clearCache(userId);
  }
}
