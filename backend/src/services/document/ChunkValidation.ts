import { Chunk, ChunkMetadata } from './SemanticChunker';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ChunkQualityMetrics {
  coherenceScore: number;
  completenessScore: number;
  readabilityScore: number;
  overallScore: number;
}

export class ChunkValidation {
  private readonly MIN_CONTENT_LENGTH = 10;
  private readonly MAX_CONTENT_LENGTH = 3000;
  private readonly MIN_SENTENCE_COUNT = 1;

  validateChunk(chunk: Chunk): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Content validation
    if (!chunk.content || chunk.content.trim().length === 0) {
      errors.push('Chunk content cannot be empty');
    } else if (chunk.content.length < this.MIN_CONTENT_LENGTH) {
      warnings.push(`Chunk content is very short (${chunk.content.length} chars)`);
    } else if (chunk.content.length > this.MAX_CONTENT_LENGTH) {
      warnings.push(`Chunk content is very long (${chunk.content.length} chars)`);
    }

    // Metadata validation
    const metadataValidation = this.validateMetadata(chunk.metadata);
    errors.push(...metadataValidation.errors);
    warnings.push(...metadataValidation.warnings);

    // Structure validation
    const structureValidation = this.validateStructure(chunk);
    errors.push(...structureValidation.errors);
    warnings.push(...structureValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateBatch(chunks: Chunk[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (chunks.length === 0) {
      errors.push('Chunk batch cannot be empty');
      return { isValid: false, errors, warnings };
    }

    // Validate individual chunks
    chunks.forEach((chunk, index) => {
      const validation = this.validateChunk(chunk);
      errors.push(...validation.errors.map((err) => `Chunk ${index}: ${err}`));
      warnings.push(...validation.warnings.map((warn) => `Chunk ${index}: ${warn}`));
    });

    // Validate chunk sequence
    const sequenceValidation = this.validateChunkSequence(chunks);
    errors.push(...sequenceValidation.errors);
    warnings.push(...sequenceValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  assessChunkQuality(chunk: Chunk): ChunkQualityMetrics {
    const coherenceScore = this.calculateCoherenceScore(chunk);
    const completenessScore = this.calculateCompletenessScore(chunk);
    const readabilityScore = this.calculateReadabilityScore(chunk);

    const overallScore = (coherenceScore + completenessScore + readabilityScore) / 3;

    return {
      coherenceScore,
      completenessScore,
      readabilityScore,
      overallScore,
    };
  }

  private validateMetadata(metadata: ChunkMetadata): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!metadata.type) {
      errors.push('Chunk metadata must have a type');
    }

    if (metadata.hierarchyLevel < 0) {
      errors.push('Hierarchy level cannot be negative');
    }

    if (metadata.position < 0) {
      errors.push('Position cannot be negative');
    }

    // Optional field validation
    if (metadata.keywords && metadata.keywords.length > 20) {
      warnings.push('Too many keywords (>20)');
    }

    if (metadata.concepts && metadata.concepts.length > 15) {
      warnings.push('Too many concepts (>15)');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateStructure(chunk: Chunk): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for incomplete sentences
    const sentences = chunk.content.split(/[.!?]+/);
    if (sentences.length < this.MIN_SENTENCE_COUNT) {
      warnings.push('Chunk contains fewer than expected sentences');
    }

    // Check for orphaned content type structures
    if (chunk.metadata.type === 'code' && !chunk.content.includes('```')) {
      warnings.push('Code chunk does not contain code blocks');
    }

    if (
      chunk.metadata.type === 'list' &&
      !/^[\s]*[-*+•]\s+|^[\s]*\d+[.)]\s+/m.test(chunk.content)
    ) {
      warnings.push('List chunk does not contain list items');
    }

    // Check for balanced parentheses and brackets
    if (!this.hasBalancedBrackets(chunk.content)) {
      warnings.push('Chunk contains unbalanced brackets or parentheses');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateChunkSequence(chunks: Chunk[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate IDs
    const ids = chunks.map((chunk) => chunk.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      errors.push('Duplicate chunk IDs detected');
    }

    // Check position sequence
    const positions = chunks.map((chunk) => chunk.metadata.position);
    const sortedPositions = [...positions].sort((a, b) => a - b);
    for (let i = 0; i < sortedPositions.length - 1; i++) {
      if (sortedPositions[i] === sortedPositions[i + 1]) {
        warnings.push('Duplicate positions detected in chunk sequence');
        break;
      }
    }

    // Check navigation metadata consistency
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const { previousChunkId, nextChunkId } = chunk.metadata;

      if (i > 0 && previousChunkId !== chunks[i - 1].id) {
        warnings.push(`Chunk ${i} has incorrect previousChunkId`);
      }

      if (i < chunks.length - 1 && nextChunkId !== chunks[i + 1].id) {
        warnings.push(`Chunk ${i} has incorrect nextChunkId`);
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private calculateCoherenceScore(chunk: Chunk): number {
    let score = 1.0;

    // Check sentence transitions
    const sentences = chunk.content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length > 1) {
      const transitionWords =
        /\b(?:however|therefore|furthermore|moreover|additionally|consequently|meanwhile|subsequently|nevertheless|accordingly)\b/i;
      const hasTransitions = sentences.some((sentence) => transitionWords.test(sentence));
      if (hasTransitions) score += 0.2;
    }

    // Check for topic consistency
    const topicWords = this.extractTopicWords(chunk.content);
    const uniqueTopics = new Set(topicWords);
    if (topicWords.length > 0 && uniqueTopics.size / topicWords.length > 0.7) {
      score -= 0.3; // Too many different topics
    }

    return Math.max(0, Math.min(1, score));
  }

  private calculateCompletenessScore(chunk: Chunk): number {
    let score = 0.5; // Base score

    // Check for complete sentences
    const endsWithPunctuation = /[.!?]$/.test(chunk.content.trim());
    if (endsWithPunctuation) score += 0.2;

    // Check for section boundaries
    if (chunk.metadata.isStartOfSection || chunk.metadata.isEndOfSection) {
      score += 0.1;
    }

    // Check content type specific completeness
    switch (chunk.metadata.type) {
      case 'definition':
        if (
          chunk.content.toLowerCase().includes('definition') ||
          /\b(?:is|are|means)\b/i.test(chunk.content)
        ) {
          score += 0.2;
        }
        break;
      case 'example':
        if (/\b(?:example|for instance|such as)\b/i.test(chunk.content)) {
          score += 0.2;
        }
        break;
      case 'code':
        if (chunk.content.includes('```')) {
          score += 0.2;
        }
        break;
    }

    return Math.max(0, Math.min(1, score));
  }

  private calculateReadabilityScore(chunk: Chunk): number {
    const words = chunk.content.split(/\s+/).length;
    const sentences = chunk.content.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;

    if (sentences === 0) return 0;

    const avgWordsPerSentence = words / sentences;

    // Optimal range: 15-20 words per sentence
    let score = 1.0;
    if (avgWordsPerSentence < 10 || avgWordsPerSentence > 25) {
      score -= 0.3;
    }

    // Check for overly long sentences
    const longSentences = chunk.content
      .split(/[.!?]+/)
      .filter((s) => s.trim().split(/\s+/).length > 30).length;
    if (longSentences > 0) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  private hasBalancedBrackets(text: string): boolean {
    const brackets = { '(': ')', '[': ']', '{': '}' };
    const stack: string[] = [];

    for (const char of text) {
      if (char in brackets) {
        stack.push(char);
      } else if (Object.values(brackets).includes(char)) {
        const last = stack.pop();
        if (!last || brackets[last as keyof typeof brackets] !== char) {
          return false;
        }
      }
    }

    return stack.length === 0;
  }

  private extractTopicWords(content: string): string[] {
    // Extract nouns and important terms
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3);

    // Simple topic extraction - could be enhanced with NLP
    const topicWords = words.filter(
      (word) => !/^(?:the|this|that|with|from|they|have|been|will|would|could|should)$/.test(word)
    );

    return topicWords.slice(0, 10); // Limit to top 10
  }
}
