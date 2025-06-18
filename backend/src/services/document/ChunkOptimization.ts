import { Chunk } from './SemanticChunker';

export interface OptimizationOptions {
  overlapSize: number;
  enableMerging: boolean;
  maxMergeSize: number;
  minViableSize: number;
}

export interface MergeCandidate {
  chunk: Chunk;
  nextChunk: Chunk;
  mergedSize: number;
  similarity: number;
}

export class ChunkOptimization {
  private readonly DEFAULT_OPTIONS: OptimizationOptions = {
    overlapSize: 100,
    enableMerging: true,
    maxMergeSize: 2000,
    minViableSize: 150,
  };

  optimizeChunks(chunks: Chunk[], options: Partial<OptimizationOptions> = {}): Chunk[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    let optimizedChunks = [...chunks];

    // Step 1: Merge small adjacent chunks if beneficial
    if (opts.enableMerging) {
      optimizedChunks = this.mergeSmallChunks(optimizedChunks, opts);
    }

    // Step 2: Add overlap between chunks
    if (opts.overlapSize > 0) {
      optimizedChunks = this.addOverlap(optimizedChunks, opts.overlapSize);
    }

    // Step 3: Update navigation metadata after optimization
    optimizedChunks = this.updateNavigationMetadata(optimizedChunks);

    return optimizedChunks;
  }

  addOverlap(chunks: Chunk[], overlapSize: number): Chunk[] {
    if (chunks.length === 0 || overlapSize <= 0) {
      return chunks;
    }

    const overlappedChunks: Chunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let content = chunk.content;

      // Add overlap from previous chunk
      if (i > 0) {
        const prevContent = chunks[i - 1].content;
        const overlapText = this.extractOverlapText(prevContent, overlapSize, 'end');
        if (overlapText) {
          content = overlapText + '\n\n' + content;
        }
      }

      // Add overlap from next chunk
      if (i < chunks.length - 1) {
        const nextContent = chunks[i + 1].content;
        const overlapText = this.extractOverlapText(nextContent, overlapSize, 'start');
        if (overlapText) {
          content = content + '\n\n' + overlapText;
        }
      }

      overlappedChunks.push({
        ...chunk,
        content,
      });
    }

    return overlappedChunks;
  }

  mergeSmallChunks(chunks: Chunk[], options: OptimizationOptions): Chunk[] {
    if (chunks.length === 0) return chunks;

    const merged: Chunk[] = [];
    let i = 0;

    while (i < chunks.length) {
      const current = chunks[i];

      // Check if current chunk is too small and can be merged
      if (current.content.length < options.minViableSize && i < chunks.length - 1) {
        const mergeCandidate = this.findBestMergeCandidate(current, chunks.slice(i + 1), options);

        if (mergeCandidate) {
          const mergedChunk = this.mergeChunks(current, mergeCandidate.chunk);
          merged.push(mergedChunk);

          // Skip the merged chunk
          const skipIndex = chunks.findIndex((c) => c.id === mergeCandidate.chunk.id);
          i = Math.max(i + 1, skipIndex + 1);
        } else {
          merged.push(current);
          i++;
        }
      } else {
        merged.push(current);
        i++;
      }
    }

    return merged;
  }

  private findBestMergeCandidate(
    chunk: Chunk,
    candidates: Chunk[],
    options: OptimizationOptions
  ): MergeCandidate | null {
    const mergeable = candidates
      .filter((candidate) => {
        const mergedSize = chunk.content.length + candidate.content.length;
        return mergedSize <= options.maxMergeSize && this.canMergeChunks(chunk, candidate);
      })
      .map((candidate) => ({
        chunk,
        nextChunk: candidate,
        mergedSize: chunk.content.length + candidate.content.length,
        similarity: this.calculateSimilarity(chunk, candidate),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    return mergeable.length > 0 ? mergeable[0] : null;
  }

  private canMergeChunks(chunk1: Chunk, chunk2: Chunk): boolean {
    // Only merge chunks from the same section or adjacent sections
    if (chunk1.metadata.sectionId && chunk2.metadata.sectionId) {
      if (chunk1.metadata.sectionId !== chunk2.metadata.sectionId) {
        // Check if they're from adjacent sections with similar hierarchy
        const levelDiff = Math.abs(chunk1.metadata.hierarchyLevel - chunk2.metadata.hierarchyLevel);
        if (levelDiff > 1) return false;
      }
    }

    // Don't merge different content types unless they're compatible
    const compatibleTypes = [
      ['explanation', 'example'],
      ['definition', 'explanation'],
      ['introduction', 'explanation'],
      ['theory', 'practice'],
    ];

    const type1 = chunk1.metadata.type;
    const type2 = chunk2.metadata.type;

    if (type1 !== type2) {
      const isCompatible = compatibleTypes.some(
        ([t1, t2]) => (type1 === t1 && type2 === t2) || (type1 === t2 && type2 === t1)
      );
      if (!isCompatible) return false;
    }

    return true;
  }

  private calculateSimilarity(chunk1: Chunk, chunk2: Chunk): number {
    let similarity = 0;

    // Content type similarity
    if (chunk1.metadata.type === chunk2.metadata.type) {
      similarity += 0.3;
    }

    // Section similarity
    if (chunk1.metadata.sectionId === chunk2.metadata.sectionId) {
      similarity += 0.4;
    }

    // Keyword overlap
    const keywords1 = new Set(chunk1.metadata.keywords || []);
    const keywords2 = new Set(chunk2.metadata.keywords || []);
    const intersection = new Set([...keywords1].filter((k) => keywords2.has(k)));
    const union = new Set([...keywords1, ...keywords2]);

    if (union.size > 0) {
      similarity += 0.2 * (intersection.size / union.size);
    }

    // Concept overlap
    const concepts1 = new Set(chunk1.metadata.concepts || []);
    const concepts2 = new Set(chunk2.metadata.concepts || []);
    const conceptIntersection = new Set([...concepts1].filter((c) => concepts2.has(c)));
    const conceptUnion = new Set([...concepts1, ...concepts2]);

    if (conceptUnion.size > 0) {
      similarity += 0.1 * (conceptIntersection.size / conceptUnion.size);
    }

    return similarity;
  }

  private mergeChunks(chunk1: Chunk, chunk2: Chunk): Chunk {
    const mergedContent = chunk1.content + '\n\n' + chunk2.content;

    // Combine metadata intelligently
    const mergedKeywords = [
      ...(chunk1.metadata.keywords || []),
      ...(chunk2.metadata.keywords || []),
    ];
    const uniqueKeywords = [...new Set(mergedKeywords)].slice(0, 10);

    const mergedConcepts = [
      ...(chunk1.metadata.concepts || []),
      ...(chunk2.metadata.concepts || []),
    ];
    const uniqueConcepts = [...new Set(mergedConcepts)].slice(0, 10);

    const mergedReferences = [
      ...(chunk1.metadata.references || []),
      ...(chunk2.metadata.references || []),
    ];
    const uniqueReferences = [...new Set(mergedReferences)];

    return {
      id: `merged-${chunk1.id}-${chunk2.id}`,
      content: mergedContent,
      metadata: {
        ...chunk1.metadata,
        keywords: uniqueKeywords,
        concepts: uniqueConcepts,
        references: uniqueReferences,
        isStartOfSection: chunk1.metadata.isStartOfSection,
        isEndOfSection: chunk2.metadata.isEndOfSection,
        // Use the higher importance level
        importance: this.getHigherImportance(
          chunk1.metadata.importance,
          chunk2.metadata.importance
        ),
      },
    };
  }

  private extractOverlapText(
    content: string,
    overlapSize: number,
    position: 'start' | 'end'
  ): string {
    const words = content.split(/\s+/);

    if (words.length <= overlapSize) {
      return content;
    }

    const selectedWords =
      position === 'end' ? words.slice(-overlapSize) : words.slice(0, overlapSize);

    return selectedWords.join(' ');
  }

  private updateNavigationMetadata(chunks: Chunk[]): Chunk[] {
    return chunks.map((chunk, index) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        position: index,
        totalChunks: chunks.length,
        previousChunkId: index > 0 ? chunks[index - 1].id : undefined,
        nextChunkId: index < chunks.length - 1 ? chunks[index + 1].id : undefined,
      },
    }));
  }

  private getHigherImportance(
    importance1?: 'high' | 'medium' | 'low',
    importance2?: 'high' | 'medium' | 'low'
  ): 'high' | 'medium' | 'low' {
    const levels = { high: 3, medium: 2, low: 1 };
    const level1 = levels[importance1 || 'low'];
    const level2 = levels[importance2 || 'low'];

    const maxLevel = Math.max(level1, level2);
    return Object.keys(levels).find((key) => levels[key as keyof typeof levels] === maxLevel) as
      | 'high'
      | 'medium'
      | 'low';
  }

  // Utility methods for chunk size analysis
  analyzeChunkSizes(chunks: Chunk[]): {
    average: number;
    min: number;
    max: number;
    distribution: Record<string, number>;
  } {
    if (chunks.length === 0) {
      return { average: 0, min: 0, max: 0, distribution: {} };
    }

    const sizes = chunks.map((chunk) => chunk.content.length);
    const average = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
    const min = Math.min(...sizes);
    const max = Math.max(...sizes);

    // Create size distribution buckets
    const distribution: Record<string, number> = {
      'tiny (0-200)': 0,
      'small (201-500)': 0,
      'medium (501-1000)': 0,
      'large (1001-1500)': 0,
      'xlarge (1501+)': 0,
    };

    sizes.forEach((size) => {
      if (size <= 200) distribution['tiny (0-200)']++;
      else if (size <= 500) distribution['small (201-500)']++;
      else if (size <= 1000) distribution['medium (501-1000)']++;
      else if (size <= 1500) distribution['large (1001-1500)']++;
      else distribution['xlarge (1501+)']++;
    });

    return { average, min, max, distribution };
  }
}
