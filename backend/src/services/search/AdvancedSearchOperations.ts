import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { pythonEmbeddingService } from '../embeddings/PythonEmbeddingService';
import { SearchOptions, SearchResult } from './types';

interface UserInteraction {
  file_id: string;
  interaction_type: 'view' | 'download' | 'bookmark' | 'share';
  interaction_count: number;
}

interface FileMetadata {
  id: string;
  created_at: string;
  view_count: number;
  download_count: number;
}

interface VectorSearchResult {
  chunk_id: string;
  file_id: string;
  file_name?: string;
  content: string;
  similarity: number;
  chunk_index?: number;
  chunk_type?: string;
  importance?: string;
  section_title?: string;
  concepts?: string[];
  keywords?: string[];
}

interface ScoredResult extends VectorSearchResult {
  customScore: number;
  scoreComponents: {
    vector: number;
    recency: number;
    popularity: number;
    personal: number;
  };
}

export class AdvancedSearchOperations {
  private embeddingService = pythonEmbeddingService;

  constructor() {
    // Using singleton instance of pythonEmbeddingService
  }

  async getSuggestions(query: string, userId: string, limit: number = 5): Promise<string[]> {
    try {
      // Get recent searches for the user
      const { data: recentSearches } = await supabase
        .from('search_history')
        .select('query')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      // Get popular searches across all users
      const { data: popularSearches } = await supabase
        .from('search_history')
        .select('query')
        .order('search_count', { ascending: false })
        .limit(20);

      // Combine and deduplicate
      const allSearches = new Set<string>();
      recentSearches?.forEach((s) => allSearches.add(s.query.toLowerCase()));
      popularSearches?.forEach((s) => allSearches.add(s.query.toLowerCase()));

      // Filter suggestions based on query prefix
      const queryLower = query.toLowerCase();
      const suggestions = Array.from(allSearches)
        .filter((s) => s.startsWith(queryLower) && s !== queryLower)
        .slice(0, limit);

      // If not enough suggestions, add semantic suggestions
      if (suggestions.length < limit) {
        const semanticSuggestions = await this.getSemanticSuggestions(
          query,
          limit - suggestions.length
        );
        suggestions.push(...semanticSuggestions);
      }

      return suggestions.slice(0, limit);
    } catch (error) {
      logger.error('[AdvancedSearch] Error getting suggestions:', error);
      return [];
    }
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
    const startTime = Date.now();
    logger.info('[AdvancedSearch] Custom scoring search', { query, userId });

    // Generate embedding for the query
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Get base results with vector similarity
    const { data: vectorResults, error } = await supabase.rpc('search_similar_chunks', {
      query_embedding: embeddingStr,
      match_count: (options.limit || 10) * 2, // Get more for custom scoring
      similarity_threshold: options.threshold || 0.7,
    });

    if (error) {
      logger.error('[AdvancedSearch] Vector search error:', error);
      throw new Error('Vector search failed');
    }

    // Get user interaction data for personalization
    const { data: userInteractions } = await supabase
      .from('user_interactions')
      .select('file_id, interaction_type, interaction_count')
      .eq('user_id', userId);

    // Get file metadata for recency and popularity
    const fileIds = vectorResults?.map((r: VectorSearchResult) => r.file_id) || [];
    const { data: fileMetadata } = await supabase
      .from('files')
      .select('id, created_at, view_count, download_count')
      .in('id', fileIds);

    // Apply custom scoring
    const scoredResults = this.applyCustomScoring(
      vectorResults || [],
      userInteractions || [],
      fileMetadata || [],
      options.customScoring || {}
    );

    // Transform to SearchResult format
    const results = this.transformToSearchResults(scoredResults);

    logger.info('[AdvancedSearch] Custom scoring completed', {
      resultsCount: results.length,
      searchTime: Date.now() - startTime,
    });

    return results;
  }

  private async getSemanticSuggestions(query: string, limit: number): Promise<string[]> {
    try {
      // Use embeddings to find semantically similar queries
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);
      const embeddingStr = `[${queryEmbedding.join(',')}]`;

      const { data } = await supabase.rpc('search_similar_queries', {
        query_embedding: embeddingStr,
        match_count: limit,
        similarity_threshold: 0.8,
      });

      return data?.map((d: { query: string }) => d.query) || [];
    } catch (error) {
      logger.error('[AdvancedSearch] Error getting semantic suggestions:', error);
      return [];
    }
  }

  private applyCustomScoring(
    vectorResults: VectorSearchResult[],
    userInteractions: UserInteraction[],
    fileMetadata: FileMetadata[],
    scoringWeights: {
      recencyWeight?: number;
      popularityWeight?: number;
      personalRelevanceWeight?: number;
    }
  ): ScoredResult[] {
    const weights = {
      recency: scoringWeights.recencyWeight || 0.2,
      popularity: scoringWeights.popularityWeight || 0.2,
      personalRelevance: scoringWeights.personalRelevanceWeight || 0.3,
      vectorSimilarity: 0.3, // Base weight for vector similarity
    };

    // Create maps for quick lookup
    const interactionMap = new Map(userInteractions.map((i) => [i.file_id, i]));
    const metadataMap = new Map(fileMetadata.map((f) => [f.id, f]));

    return vectorResults
      .map((result) => {
        const fileId = result.file_id;
        const metadata = metadataMap.get(fileId);
        const interaction = interactionMap.get(fileId);

        // Calculate component scores
        const vectorScore = result.similarity;

        // Recency score (newer files score higher)
        const recencyScore = metadata ? this.calculateRecencyScore(metadata.created_at) : 0.5;

        // Popularity score (based on views and downloads)
        const popularityScore = metadata
          ? this.calculatePopularityScore(metadata.view_count, metadata.download_count)
          : 0.5;

        // Personal relevance score (based on user's past interactions)
        const personalScore = interaction ? this.calculatePersonalRelevanceScore(interaction) : 0.5;

        // Calculate final score
        const finalScore =
          vectorScore * weights.vectorSimilarity +
          recencyScore * weights.recency +
          popularityScore * weights.popularity +
          personalScore * weights.personalRelevance;

        return {
          ...result,
          customScore: finalScore,
          scoreComponents: {
            vector: vectorScore,
            recency: recencyScore,
            popularity: popularityScore,
            personal: personalScore,
          },
        };
      })
      .sort((a, b) => b.customScore - a.customScore);
  }

  private calculateRecencyScore(createdAt: string): number {
    const ageInDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    // Exponential decay: newer content scores higher
    return Math.exp(-ageInDays / 30); // 30-day half-life
  }

  private calculatePopularityScore(viewCount: number, downloadCount: number): number {
    const totalInteractions = viewCount + downloadCount * 2; // Downloads weighted more
    // Logarithmic scale to prevent extremely popular items from dominating
    return Math.min(Math.log10(totalInteractions + 1) / 3, 1);
  }

  private calculatePersonalRelevanceScore(interaction: UserInteraction): number {
    const interactionWeight = {
      view: 0.3,
      download: 0.5,
      bookmark: 0.7,
      share: 0.6,
    };

    const weight =
      interactionWeight[interaction.interaction_type as keyof typeof interactionWeight] || 0.3;
    const frequency = Math.min(interaction.interaction_count / 10, 1); // Cap at 10 interactions

    return weight * frequency;
  }

  private transformToSearchResults(scoredResults: ScoredResult[]): SearchResult[] {
    return scoredResults.map((item) => ({
      id: item.chunk_id,
      fileId: item.file_id,
      fileName: item.file_name || 'Unknown',
      content: item.content,
      score: item.customScore || item.similarity,
      vectorScore: item.similarity,
      metadata: {
        chunkIndex: item.chunk_index || 0,
        contentType: item.chunk_type || 'text',
        importance: item.importance || 'medium',
        sectionTitle: item.section_title,
        concepts: item.concepts || [],
        keywords: item.keywords || [],
      },
      scoreComponents: item.scoreComponents,
    }));
  }
}
