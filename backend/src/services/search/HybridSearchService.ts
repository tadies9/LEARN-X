import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { EmbeddingService } from '../embeddings/EmbeddingService';
import { SearchResult } from '../../types/ai';

export class HybridSearchService {
  private embeddingService: EmbeddingService;
  private semanticWeight: number = 0.7;
  private keywordWeight: number = 0.3;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  async search(
    query: string,
    fileId: string,
    userId: string,
    limit: number = 20
  ): Promise<SearchResult[]> {
    try {
      // Run semantic and keyword searches in parallel
      const [semanticResults, keywordResults] = await Promise.all([
        this.semanticSearch(query, fileId, userId, limit),
        this.keywordSearch(query, fileId, limit),
      ]);

      // Merge and score results
      return this.mergeResults(
        semanticResults,
        keywordResults,
        this.semanticWeight,
        this.keywordWeight
      );
    } catch (error) {
      logger.error('Hybrid search failed:', error);
      throw error;
    }
  }

  private async semanticSearch(
    query: string,
    fileId: string,
    userId: string,
    limit: number
  ): Promise<SearchResult[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbedding(query, userId);

      // Search using pgvector cosine similarity
      const { data, error } = await supabase.rpc('search_chunks_by_embedding', {
        query_embedding: queryEmbedding,
        file_id: fileId,
        match_threshold: 0.7,
        match_count: limit,
      });

      if (error) {
        logger.error('Semantic search error:', error);
        return [];
      }

      return data.map((row: any) => ({
        chunkId: row.chunk_id,
        content: row.content,
        score: row.similarity,
        metadata: row.metadata,
      }));
    } catch (error) {
      logger.error('Semantic search failed:', error);
      return [];
    }
  }

  private async keywordSearch(
    query: string,
    fileId: string,
    limit: number
  ): Promise<SearchResult[]> {
    try {
      // Use PostgreSQL full-text search
      const { data, error } = await supabase
        .from('file_chunks')
        .select('id, content, metadata')
        .eq('file_id', fileId)
        .textSearch('content', query, {
          config: 'english',
          type: 'websearch',
        })
        .limit(limit);

      if (error) {
        logger.error('Keyword search error:', error);
        return [];
      }

      // Calculate relevance scores
      return data.map((row: any, index: number) => ({
        chunkId: row.id,
        content: row.content,
        score: 1 - index / data.length, // Simple ranking based on order
        metadata: row.metadata,
      }));
    } catch (error) {
      logger.error('Keyword search failed:', error);
      return [];
    }
  }

  private mergeResults(
    semanticResults: SearchResult[],
    keywordResults: SearchResult[],
    semanticWeight: number,
    keywordWeight: number
  ): SearchResult[] {
    const mergedMap = new Map<string, SearchResult>();

    // Add semantic results with weighted scores
    semanticResults.forEach((result) => {
      mergedMap.set(result.chunkId, {
        ...result,
        score: result.score * semanticWeight,
      });
    });

    // Add or update with keyword results
    keywordResults.forEach((result) => {
      const existing = mergedMap.get(result.chunkId);
      if (existing) {
        // Combine scores if chunk appears in both results
        existing.score += result.score * keywordWeight;
      } else {
        // Add new result with weighted score
        mergedMap.set(result.chunkId, {
          ...result,
          score: result.score * keywordWeight,
        });
      }
    });

    // Convert to array and sort by combined score
    const merged = Array.from(mergedMap.values());
    merged.sort((a, b) => b.score - a.score);

    // Normalize scores to 0-1 range
    const maxScore = merged[0]?.score || 1;
    merged.forEach((result) => {
      result.score = result.score / maxScore;
    });

    return merged;
  }

  async logSearch(
    query: string,
    resultsCount: number,
    userId: string,
    clickedResults?: string[]
  ): Promise<void> {
    try {
      await supabase.from('search_logs').insert({
        user_id: userId,
        query,
        results_count: resultsCount,
        clicked_results: clickedResults || [],
      });
    } catch (error) {
      logger.error('Failed to log search:', error);
    }
  }

  async getFileChunks(fileId: string): Promise<any[]> {
    try {
      const { data: chunks, error } = await supabase
        .from('file_chunks')
        .select(
          `
          id,
          content,
          position,
          metadata,
          chunk_embeddings (
            embedding
          )
        `
        )
        .eq('file_id', fileId)
        .order('position');

      if (error) throw error;

      return chunks || [];
    } catch (error) {
      logger.error('Failed to get file chunks:', error);
      throw error;
    }
  }

  async clusterChunks(chunks: any[]): Promise<any[]> {
    try {
      // Simple clustering based on position and content similarity
      // In a production system, this would use more sophisticated clustering algorithms
      const sections: any[] = [];
      let currentSection: any = null;
      const sectionSize = 5; // Group every 5 chunks into a section

      chunks.forEach((chunk, index) => {
        if (index % sectionSize === 0) {
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = {
            id: `section-${sections.length + 1}`,
            suggestedTitle: `Section ${sections.length + 1}`,
            summary: '',
            chunkIds: [],
            startPage: chunk.metadata?.page || 1,
            endPage: chunk.metadata?.page || 1,
            topics: [],
          };
        }

        currentSection.chunkIds.push(chunk.id);
        currentSection.endPage = chunk.metadata?.page || currentSection.endPage;

        // Extract topics from content (simplified)
        const topics = this.extractTopics(chunk.content);
        currentSection.topics = [...new Set([...currentSection.topics, ...topics])];
      });

      if (currentSection) {
        sections.push(currentSection);
      }

      // Generate titles and summaries for each section
      for (const section of sections) {
        const sectionChunks = chunks.filter((c) => section.chunkIds.includes(c.id));
        const combinedContent = sectionChunks.map((c) => c.content).join(' ');

        // Extract the most prominent topic as title
        section.suggestedTitle = this.generateSectionTitle(combinedContent);
        section.summary = this.generateSectionSummary(combinedContent);
      }

      return sections;
    } catch (error) {
      logger.error('Failed to cluster chunks:', error);
      throw error;
    }
  }

  private extractTopics(content: string): string[] {
    // Simple topic extraction - in production, use NLP
    const words = content.toLowerCase().split(/\s+/);
    const commonWords = new Set([
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
    ]);

    const topics = words.filter((word) => word.length > 4 && !commonWords.has(word)).slice(0, 5);

    return [...new Set(topics)];
  }

  private generateSectionTitle(content: string): string {
    // Extract first meaningful sentence or phrase
    const sentences = content.split(/[.!?]+/);
    const firstSentence = sentences[0]?.trim() || 'Untitled Section';

    // Limit to reasonable length
    return firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence;
  }

  private generateSectionSummary(content: string): string {
    // Simple summary - take first 200 characters
    const summary = content.substring(0, 200).trim();
    return summary + (content.length > 200 ? '...' : '');
  }
}
