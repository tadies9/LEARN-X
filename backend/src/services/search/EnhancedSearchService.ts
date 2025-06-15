import {
  HybridSearchService,
  SearchOptions,
  SearchResult,
  SearchResponse,
} from './HybridSearchService';
import { VectorEmbeddingService } from '../embeddings/VectorEmbeddingService';
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
  private embeddingService: VectorEmbeddingService;

  constructor() {
    super();
    this.embeddingService = new VectorEmbeddingService();
  }

  async semanticSearch(
    query: string,
    userId: string,
    options: SemanticSearchOptions = {}
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    // Enhanced options with semantic features
    const enhancedOptions: SemanticSearchOptions = {
      ...options,
      semanticBoost: options.semanticBoost ?? true,
      contextWindow: options.contextWindow ?? 3,
      rerank: options.rerank ?? true,
      diversityFactor: options.diversityFactor ?? 0.3,
    };

    // Get initial results from hybrid search
    const initialResults = await super.search(query, userId, enhancedOptions);

    if (!enhancedOptions.semanticBoost) {
      return initialResults;
    }

    // Apply semantic enhancements
    let enhancedResults = initialResults.results as EnhancedSearchResult[];

    // 1. Context-aware reranking
    if (enhancedOptions.rerank) {
      enhancedResults = await this.semanticRerank(query, enhancedResults, enhancedOptions);
    }

    // 2. Add contextual relevance scores
    enhancedResults = await this.addContextualRelevance(
      enhancedResults,
      enhancedOptions.contextWindow || 3
    );

    // 3. Apply diversity optimization
    if (enhancedOptions.diversityFactor && enhancedOptions.diversityFactor > 0) {
      enhancedResults = this.optimizeForDiversity(enhancedResults, enhancedOptions.diversityFactor);
    }

    return {
      ...initialResults,
      results: enhancedResults.slice(0, enhancedOptions.limit || 10),
      searchTime: Date.now() - startTime,
    };
  }

  private async semanticRerank(
    query: string,
    results: EnhancedSearchResult[],
    _options: SemanticSearchOptions
  ): Promise<EnhancedSearchResult[]> {
    // Generate query embedding for semantic comparison
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // Get embeddings for all results
    const resultEmbeddings = await this.getResultEmbeddings(results);

    // Calculate semantic scores
    const semanticScores = resultEmbeddings.map((embedding) =>
      this.cosineSimilarity(queryEmbedding, embedding)
    );

    // Combine with existing scores
    return results
      .map((result, index) => {
        const semanticScore = semanticScores[index];
        const combinedScore = result.score * 0.4 + semanticScore * 0.6;

        return {
          ...result,
          semanticScore,
          score: combinedScore,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private async addContextualRelevance(
    results: EnhancedSearchResult[],
    contextWindow: number
  ): Promise<EnhancedSearchResult[]> {
    return Promise.all(
      results.map(async (result) => {
        // Get surrounding chunks
        const contextChunks = await this.getContextualChunks(
          result.fileId,
          result.metadata.chunkIndex,
          contextWindow
        );

        // Calculate contextual relevance based on surrounding content
        const contextualRelevance = this.calculateContextualRelevance(result, contextChunks);

        return {
          ...result,
          contextualRelevance,
        };
      })
    );
  }

  private optimizeForDiversity(
    results: EnhancedSearchResult[],
    diversityFactor: number
  ): EnhancedSearchResult[] {
    const selected: EnhancedSearchResult[] = [];
    const remaining = [...results];

    while (selected.length < results.length && remaining.length > 0) {
      if (selected.length === 0) {
        // Select the highest scoring result first
        selected.push(remaining.shift()!);
      } else {
        // Select next result based on score and diversity
        let bestIndex = 0;
        let bestScore = -Infinity;

        remaining.forEach((candidate, index) => {
          const diversity = this.calculateDiversity(candidate, selected);
          const combinedScore =
            candidate.score * (1 - diversityFactor) + diversity * diversityFactor;

          if (combinedScore > bestScore) {
            bestScore = combinedScore;
            bestIndex = index;
          }
        });

        selected.push(remaining.splice(bestIndex, 1)[0]);
      }
    }

    return selected;
  }

  private calculateDiversity(
    candidate: EnhancedSearchResult,
    selected: EnhancedSearchResult[]
  ): number {
    // Calculate diversity based on different factors
    const factors = {
      section: 0,
      contentType: 0,
      concepts: 0,
    };

    selected.forEach((result) => {
      // Different section
      if (result.metadata.sectionTitle !== candidate.metadata.sectionTitle) {
        factors.section += 1;
      }

      // Different content type
      if (result.metadata.contentType !== candidate.metadata.contentType) {
        factors.contentType += 1;
      }

      // Different concepts
      const resultConcepts = new Set(result.metadata.concepts || []);
      const candidateConcepts = new Set(candidate.metadata.concepts || []);
      const intersection = new Set([...resultConcepts].filter((x) => candidateConcepts.has(x)));
      factors.concepts +=
        1 - intersection.size / Math.max(resultConcepts.size, candidateConcepts.size, 1);
    });

    // Normalize diversity score
    return (
      (factors.section * 0.3 + factors.contentType * 0.3 + factors.concepts * 0.4) / selected.length
    );
  }

  private async getResultEmbeddings(results: SearchResult[]): Promise<number[][]> {
    const embeddings = await Promise.all(
      results.map(async (result) => {
        // Try to get cached embedding first
        const { data } = await supabase
          .from('file_embeddings')
          .select('embedding')
          .eq('chunk_id', result.id)
          .single();

        if (data?.embedding) {
          return Array.isArray(data.embedding) ? data.embedding : JSON.parse(data.embedding);
        }

        // Generate embedding if not cached
        return this.embeddingService.generateEmbedding(result.content);
      })
    );

    return embeddings;
  }

  private async getContextualChunks(
    fileId: string,
    chunkIndex: number,
    window: number
  ): Promise<any[]> {
    const { data } = await supabase
      .from('file_chunks')
      .select('*')
      .eq('file_id', fileId)
      .gte('chunk_index', chunkIndex - window)
      .lte('chunk_index', chunkIndex + window)
      .order('chunk_index');

    return data || [];
  }

  private calculateContextualRelevance(result: SearchResult, contextChunks: any[]): number {
    // Calculate relevance based on context continuity and coherence
    let relevance = 0;
    const resultIndex = result.metadata.chunkIndex;

    contextChunks.forEach((chunk) => {
      const distance = Math.abs(chunk.chunk_index - resultIndex);
      if (distance === 0) return; // Skip self

      // Closer chunks have more influence
      const weight = 1 / (distance + 1);

      // Check for topic continuity
      const sharedConcepts = this.getSharedConcepts(
        result.metadata.concepts || [],
        chunk.chunk_metadata?.concepts || []
      );

      relevance += weight * (sharedConcepts.length > 0 ? 1 : 0.5);
    });

    return Math.min(relevance / contextChunks.length, 1);
  }

  private getSharedConcepts(concepts1: string[], concepts2: string[]): string[] {
    const set1 = new Set(concepts1);
    return concepts2.filter((c) => set1.has(c));
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  async searchWithFeedback(
    query: string,
    userId: string,
    options: SemanticSearchOptions = {},
    previousResults?: string[]
  ): Promise<SearchResponse> {
    // Adjust search based on previous results to avoid repetition
    const enhancedOptions: SemanticSearchOptions = {
      ...options,
      filters: {
        ...options.filters,
      },
    };

    const results = await this.semanticSearch(query, userId, enhancedOptions);

    if (previousResults && previousResults.length > 0) {
      // Filter out previously seen results
      results.results = results.results.filter((r) => !previousResults.includes(r.id));
    }

    return results;
  }

  async searchByExample(
    exampleChunkId: string,
    userId: string,
    options: SemanticSearchOptions = {}
  ): Promise<SearchResponse> {
    // Get the example chunk
    const { data: exampleChunk } = await supabase
      .from('file_chunks')
      .select('*')
      .eq('id', exampleChunkId)
      .single();

    if (!exampleChunk) {
      throw new Error('Example chunk not found');
    }

    // Use the example content as the query
    const query = exampleChunk.content;

    // Search with boosted semantic similarity
    return this.semanticSearch(query, userId, {
      ...options,
      searchType: 'vector',
      weightVector: 0.9,
      weightKeyword: 0.1,
      filters: {
        ...options.filters,
        // Exclude the example chunk itself
        fileId: options.filters?.fileId || undefined,
      },
    });
  }
}
