/**
 * Smart Chunk Selector
 * Intelligently selects the most relevant chunks based on content importance
 * Following LEARN-X coding standards - focused functionality
 */

export interface ChunkWithMetadata {
  id: string;
  content: string;
  chunk_index: number;
  importance?: number;
  hasDefinitions?: boolean;
  hasExamples?: boolean;
  hasKeywords?: boolean;
  sentenceCount?: number;
}

export interface ChunkSelectionResult {
  selectedChunks: ChunkWithMetadata[];
  totalSelected: number;
  strategy: string;
  coverage: number; // Percentage of important content covered
}

/**
 * Intelligently selects chunks based on importance and relevance
 */
export class SmartChunkSelector {
  /**
   * Select chunks using the specified strategy
   */
  selectChunks(
    chunks: ChunkWithMetadata[],
    limit: number,
    strategy: 'sequential' | 'smart' | 'comprehensive'
  ): ChunkSelectionResult {
    // Enrich chunks with metadata
    const enrichedChunks = chunks.map((chunk) => this.enrichChunk(chunk));

    let selectedChunks: ChunkWithMetadata[];

    switch (strategy) {
      case 'sequential':
        selectedChunks = this.selectSequential(enrichedChunks, limit);
        break;
      case 'smart':
        selectedChunks = this.selectSmart(enrichedChunks, limit);
        break;
      case 'comprehensive':
        selectedChunks = this.selectComprehensive(enrichedChunks, limit);
        break;
      default:
        selectedChunks = this.selectSequential(enrichedChunks, limit);
    }

    const coverage = this.calculateCoverage(selectedChunks, enrichedChunks);

    return {
      selectedChunks,
      totalSelected: selectedChunks.length,
      strategy,
      coverage,
    };
  }

  /**
   * Sequential selection - first N chunks
   */
  private selectSequential(chunks: ChunkWithMetadata[], limit: number): ChunkWithMetadata[] {
    return chunks.slice(0, limit);
  }

  /**
   * Smart selection - prioritize important chunks
   */
  private selectSmart(chunks: ChunkWithMetadata[], limit: number): ChunkWithMetadata[] {
    // Always include first chunk (usually introduction)
    const mustInclude: ChunkWithMetadata[] = [];
    if (chunks.length > 0) {
      mustInclude.push(chunks[0]);
    }

    // Calculate importance scores
    const scoredChunks = chunks.map((chunk, index) => ({
      chunk,
      score: this.calculateImportanceScore(chunk, index, chunks.length),
    }));

    // Sort by importance (excluding first chunk)
    const sortedChunks = scoredChunks.slice(1).sort((a, b) => b.score - a.score);

    // Select top chunks up to limit
    const selected = [
      ...mustInclude,
      ...sortedChunks.slice(0, limit - mustInclude.length).map((sc) => sc.chunk),
    ];

    // Sort selected chunks by original index to maintain flow
    return selected.sort((a, b) => a.chunk_index - b.chunk_index);
  }

  /**
   * Comprehensive selection - balanced coverage of entire content
   */
  private selectComprehensive(chunks: ChunkWithMetadata[], limit: number): ChunkWithMetadata[] {
    if (chunks.length <= limit) {
      return chunks;
    }

    const selected: ChunkWithMetadata[] = [];

    // Always include first and last chunks
    if (chunks.length > 0) {
      selected.push(chunks[0]);
      if (chunks.length > 1) {
        selected.push(chunks[chunks.length - 1]);
      }
    }

    // Calculate section boundaries for even distribution
    const remainingSlots = limit - selected.length;
    const sectionSize = Math.floor((chunks.length - 2) / remainingSlots);

    // Select key chunks from each section
    for (let i = 0; i < remainingSlots && selected.length < limit; i++) {
      const sectionStart = 1 + i * sectionSize;
      const sectionEnd = Math.min(sectionStart + sectionSize, chunks.length - 1);

      // Find most important chunk in this section
      let bestChunk = chunks[sectionStart];
      let bestScore = this.calculateImportanceScore(bestChunk, sectionStart, chunks.length);

      for (let j = sectionStart + 1; j < sectionEnd; j++) {
        const score = this.calculateImportanceScore(chunks[j], j, chunks.length);
        if (score > bestScore) {
          bestScore = score;
          bestChunk = chunks[j];
        }
      }

      if (!selected.includes(bestChunk)) {
        selected.push(bestChunk);
      }
    }

    // Sort by index to maintain flow
    return selected.sort((a, b) => a.chunk_index - b.chunk_index);
  }

  /**
   * Enrich chunk with metadata for scoring
   */
  private enrichChunk(chunk: ChunkWithMetadata): ChunkWithMetadata {
    const content = chunk.content.toLowerCase();

    return {
      ...chunk,
      hasDefinitions: this.hasDefinitions(content),
      hasExamples: this.hasExamples(content),
      hasKeywords: this.hasImportantKeywords(content),
      sentenceCount: content.split(/[.!?]+/).filter((s) => s.trim().length > 0).length,
      importance: chunk.importance || this.estimateImportance(content),
    };
  }

  /**
   * Calculate importance score for a chunk
   */
  private calculateImportanceScore(
    chunk: ChunkWithMetadata,
    index: number,
    totalChunks: number
  ): number {
    let score = 0;

    // Position scoring
    if (index === 0) score += 10; // First chunk
    if (index === totalChunks - 1) score += 5; // Last chunk
    if (index < totalChunks * 0.2) score += 3; // Early chunks

    // Content scoring
    if (chunk.hasDefinitions) score += 8;
    if (chunk.hasExamples) score += 6;
    if (chunk.hasKeywords) score += 5;
    if (chunk.importance) score += chunk.importance * 10;

    // Length scoring (prefer substantial chunks)
    if (chunk.sentenceCount && chunk.sentenceCount > 3) score += 3;

    return score;
  }

  /**
   * Check if chunk contains definitions
   */
  private hasDefinitions(content: string): boolean {
    const definitionPatterns = [
      /\bis\s+(?:a|an|the)\s+/i,
      /\bdefin(?:ed?|ition)\s+as\b/i,
      /\bmeans?\s+that\b/i,
      /\brefers?\s+to\b/i,
      /:\s*[A-Z][^.!?]*[.!?]/,
    ];

    return definitionPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Check if chunk contains examples
   */
  private hasExamples(content: string): boolean {
    const examplePatterns = [
      /\bfor\s+example\b/i,
      /\bfor\s+instance\b/i,
      /\be\.g\.\s*,?\s*/i,
      /\bsuch\s+as\b/i,
      /\blike\s+(?:when|how)\b/i,
    ];

    return examplePatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Check if chunk has important keywords
   */
  private hasImportantKeywords(content: string): boolean {
    const importantPatterns = [
      /\b(?:important|critical|essential|key|fundamental|crucial)\b/i,
      /\b(?:remember|note|notice|observe)\s+that\b/i,
      /\b(?:first|second|third|finally|however|therefore|thus)\b/i,
      /\b(?:main|primary|core|central)\s+\w+/i,
    ];

    return importantPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Estimate importance based on content patterns
   */
  private estimateImportance(content: string): number {
    let importance = 0.5; // Base importance

    // Increase for structured content
    if (/^\d+\./.test(content.trim())) importance += 0.1;
    if (/^[A-Z][^.!?]*:/.test(content.trim())) importance += 0.1;

    // Increase for question patterns
    if (/\?/.test(content)) importance += 0.1;

    // Increase for technical content
    const technicalWords = content.match(/\b[A-Z]{2,}\b/g) || [];
    importance += Math.min(technicalWords.length * 0.05, 0.2);

    return Math.min(importance, 1.0);
  }

  /**
   * Calculate coverage percentage
   */
  private calculateCoverage(selected: ChunkWithMetadata[], all: ChunkWithMetadata[]): number {
    const totalImportance = all.reduce((sum, chunk) => sum + (chunk.importance || 0.5), 0);
    const selectedImportance = selected.reduce((sum, chunk) => sum + (chunk.importance || 0.5), 0);

    return Math.round((selectedImportance / totalImportance) * 100);
  }
}
