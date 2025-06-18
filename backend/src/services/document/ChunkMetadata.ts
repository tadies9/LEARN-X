import { ChunkMetadata, Chunk } from './SemanticChunker';
import { ContentType, Section, DocumentStructure } from './DocumentAnalyzer';

export interface MetadataGenerationOptions {
  includeKeywords: boolean;
  includeConcepts: boolean;
  includeReferences: boolean;
  maxKeywords: number;
  maxConcepts: number;
  maxReferences: number;
  calculateImportance: boolean;
}

export interface ConceptExtractionResult {
  concepts: string[];
  confidence: number;
  method: 'pattern' | 'frequency' | 'position';
}

export class ChunkMetadataGenerator {
  private readonly DEFAULT_OPTIONS: MetadataGenerationOptions = {
    includeKeywords: true,
    includeConcepts: true,
    includeReferences: true,
    maxKeywords: 10,
    maxConcepts: 8,
    maxReferences: 5,
    calculateImportance: true,
  };

  generateMetadata(
    content: string,
    section: Section,
    contentType: ContentType,
    _parentTitle: string | undefined,
    isStart: boolean,
    isEnd: boolean,
    options: Partial<MetadataGenerationOptions> = {}
  ): ChunkMetadata {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    const baseMetadata: ChunkMetadata = {
      type: contentType,
      hierarchyLevel: section.level,
      sectionTitle: section.title,
      sectionId: section.id,
      position: 0, // Will be set later by the chunker
      isStartOfSection: isStart,
      isEndOfSection: isEnd,
    };

    // Add optional metadata based on options
    if (opts.includeKeywords) {
      baseMetadata.keywords = this.extractKeywords(content, section.keywords, opts.maxKeywords);
    }

    if (opts.includeConcepts) {
      const conceptResult = this.extractConcepts(content, opts.maxConcepts);
      baseMetadata.concepts = conceptResult.concepts;
    }

    if (opts.includeReferences) {
      baseMetadata.references = this.extractReferences(content, opts.maxReferences);
    }

    if (opts.calculateImportance) {
      baseMetadata.importance = this.calculateImportance(content, contentType);
    }

    return baseMetadata;
  }

  enhanceWithDocumentMetadata(chunks: Chunk[], structure: DocumentStructure): Chunk[] {
    return chunks.map((chunk) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        academicLevel: structure.metadata.academicLevel,
        totalChunks: chunks.length,
      },
    }));
  }

  addNavigationMetadata(chunks: Chunk[]): Chunk[] {
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

  private extractKeywords(
    content: string,
    sectionKeywords: string[] = [],
    maxKeywords: number
  ): string[] {
    const keywords = new Set<string>();

    // Start with section keywords
    sectionKeywords.forEach((keyword) => keywords.add(keyword));

    // Extract from content using various methods
    const contentKeywords = [
      ...this.extractCapitalizedTerms(content),
      ...this.extractQuotedTerms(content),
      ...this.extractParentheticalTerms(content),
      ...this.extractFrequentTerms(content),
    ];

    contentKeywords.slice(0, maxKeywords - keywords.size).forEach((keyword) => {
      if (keywords.size < maxKeywords) {
        keywords.add(keyword);
      }
    });

    return Array.from(keywords).slice(0, maxKeywords);
  }

  private extractCapitalizedTerms(content: string): string[] {
    // Extract proper nouns and important concepts (capitalized phrases)
    const capitalizedPhrases = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];

    return capitalizedPhrases
      .filter((phrase) => phrase.length > 2 && phrase.length < 50)
      .filter((phrase) => !this.isCommonProperNoun(phrase))
      .slice(0, 5);
  }

  private extractQuotedTerms(content: string): string[] {
    const quotedTerms = content.match(/["']([^"']{2,30})["']/g) || [];
    return quotedTerms
      .map((term) => term.replace(/["']/g, ''))
      .filter((term) => term.length > 2)
      .slice(0, 3);
  }

  private extractParentheticalTerms(content: string): string[] {
    const parentheticalTerms = content.match(/\(([^)]{2,30})\)/g) || [];
    return parentheticalTerms
      .map((term) => term.replace(/[()]/g, ''))
      .filter((term) => term.length > 2 && !term.match(/^\d+$/))
      .slice(0, 3);
  }

  private extractFrequentTerms(content: string): string[] {
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !this.isStopWord(word));

    const frequency = new Map<string, number>();
    words.forEach((word) => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .filter(([, freq]) => freq > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  private extractConcepts(content: string, maxConcepts: number): ConceptExtractionResult {
    const concepts: string[] = [];
    let confidence = 0.5;
    let method: 'pattern' | 'frequency' | 'position' = 'pattern';

    // Pattern-based concept extraction
    const patternConcepts = this.extractConceptsByPattern(content);
    if (patternConcepts.length > 0) {
      concepts.push(...patternConcepts);
      confidence = 0.8;
      method = 'pattern';
    }

    // Position-based extraction (terms at beginning/end of sentences)
    if (concepts.length < maxConcepts) {
      const positionConcepts = this.extractConceptsByPosition(content);
      concepts.push(...positionConcepts.slice(0, maxConcepts - concepts.length));
      if (positionConcepts.length > 0) {
        confidence = Math.max(confidence, 0.6);
        method = 'position';
      }
    }

    // Frequency-based extraction as fallback
    if (concepts.length < maxConcepts) {
      const frequencyConcepts = this.extractConceptsByFrequency(content);
      concepts.push(...frequencyConcepts.slice(0, maxConcepts - concepts.length));
      if (frequencyConcepts.length > 0) {
        confidence = Math.max(confidence, 0.4);
        method = 'frequency';
      }
    }

    // Remove duplicates and filter
    const uniqueConcepts = [...new Set(concepts)]
      .filter((concept) => concept.length > 2 && concept.length < 50)
      .slice(0, maxConcepts);

    return {
      concepts: uniqueConcepts,
      confidence,
      method,
    };
  }

  private extractConceptsByPattern(content: string): string[] {
    const concepts: string[] = [];

    // Technical terms in code or math contexts
    const technicalTerms = content.match(/\b[A-Z][a-zA-Z]*(?:[A-Z][a-z]*)*\b/g) || [];
    concepts.push(...technicalTerms.filter((term) => term.length > 3));

    // Terms following definition patterns
    const definitionMatches =
      content.match(/(?:is called|known as|defined as|refers to)\s+([^.!?]{5,30})/gi) || [];
    concepts.push(
      ...definitionMatches.map((match) =>
        match.replace(/(?:is called|known as|defined as|refers to)\s+/i, '').trim()
      )
    );

    // Terms in emphasis (bold/italic in markdown)
    const emphasisTerms = content.match(/\*\*([^*]{3,20})\*\*|\*([^*]{3,20})\*/g) || [];
    concepts.push(...emphasisTerms.map((term) => term.replace(/\*/g, '')));

    return concepts;
  }

  private extractConceptsByPosition(content: string): string[] {
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const concepts: string[] = [];

    sentences.forEach((sentence) => {
      const words = sentence.trim().split(/\s+/);

      // First few words of sentences (often introduce concepts)
      if (words.length >= 3) {
        const firstPhrase = words.slice(0, 3).join(' ');
        if (this.isLikelyConceptPhrase(firstPhrase)) {
          concepts.push(firstPhrase);
        }
      }

      // Last few words before punctuation (often conclude with concepts)
      if (words.length >= 3) {
        const lastPhrase = words.slice(-3).join(' ');
        if (this.isLikelyConceptPhrase(lastPhrase)) {
          concepts.push(lastPhrase);
        }
      }
    });

    return concepts;
  }

  private extractConceptsByFrequency(content: string): string[] {
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 4 && !this.isStopWord(word));

    const frequency = new Map<string, number>();
    words.forEach((word) => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .filter(([, freq]) => freq >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([word]) => word);
  }

  private extractReferences(content: string, maxReferences: number): string[] {
    const references: string[] = [];

    // Academic citations
    const citations = content.match(/\([^)]*\d{4}[^)]*\)|\[[^\]]*\d+[^\]]*\]/g) || [];
    references.push(...citations);

    // Figure and table references
    const figureRefs = content.match(/\b(?:Figure|Fig\.|Table|Equation|Eq\.)\s+\S+/gi) || [];
    references.push(...figureRefs);

    // URL references
    const urlRefs = content.match(/https?:\/\/[^\s]+/g) || [];
    references.push(
      ...urlRefs.map((url) => (url.length > 50 ? url.substring(0, 47) + '...' : url))
    );

    // Page references
    const pageRefs = content.match(/\b(?:page|p\.|pp\.)\s+\d+(?:-\d+)?/gi) || [];
    references.push(...pageRefs);

    return [...new Set(references)].slice(0, maxReferences);
  }

  private calculateImportance(
    content: string,
    contentType: ContentType
  ): 'high' | 'medium' | 'low' {
    let score = 0;

    // Base score by content type
    const typeScores: Record<ContentType, number> = {
      definition: 3,
      summary: 3,
      introduction: 3,
      conclusion: 3,
      theory: 2,
      example: 2,
      practice: 2,
      question: 2,
      answer: 2,
      explanation: 1,
      code: 1,
      equation: 1,
      list: 1,
      table: 1,
      other: 1,
    };

    score += typeScores[contentType] || 1;

    // Check for importance indicators
    const highImportancePatterns = [
      /\b(?:important|crucial|essential|fundamental|key|critical|significant|vital|major)\b/i,
      /\b(?:must|should|need\s+to|have\s+to|required|mandatory|necessary)\b/i,
      /\b(?:note|remember|recall|caution|warning|attention|notice)\b/i,
      /\b(?:definition|theorem|principle|law|rule|concept)\b/i,
    ];

    const mediumImportancePatterns = [
      /\b(?:useful|helpful|relevant|applicable|related|concerning)\b/i,
      /\b(?:example|instance|case|scenario|situation)\b/i,
      /\b(?:consider|assume|suppose|imagine|think)\b/i,
    ];

    const highMatches = highImportancePatterns.filter((pattern) => pattern.test(content)).length;
    const mediumMatches = mediumImportancePatterns.filter((pattern) =>
      pattern.test(content)
    ).length;

    score += highMatches * 2;
    score += mediumMatches * 1;

    // Content length factor (very short or very long content might be less important)
    const wordCount = content.split(/\s+/).length;
    if (wordCount < 20 || wordCount > 300) {
      score -= 1;
    }

    // Determine final importance
    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  private isCommonProperNoun(phrase: string): boolean {
    const commonProperNouns = new Set([
      'The',
      'This',
      'That',
      'These',
      'Those',
      'Here',
      'There',
      'When',
      'Where',
      'What',
      'How',
      'Why',
      'Who',
      'Which',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]);

    return commonProperNouns.has(phrase);
  }

  private isLikelyConceptPhrase(phrase: string): boolean {
    // Avoid common sentence starters and connectors
    const avoidPatterns = [
      /^(?:the|this|that|these|those|a|an|and|or|but|if|when|where|how|why)\b/i,
      /^(?:in|on|at|by|for|with|to|from|of|about|through|during)\b/i,
      /^\d+/,
    ];

    return !avoidPatterns.some((pattern) => pattern.test(phrase.trim()));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the',
      'be',
      'to',
      'of',
      'and',
      'a',
      'in',
      'that',
      'have',
      'i',
      'it',
      'for',
      'not',
      'on',
      'with',
      'he',
      'as',
      'you',
      'do',
      'at',
      'this',
      'but',
      'his',
      'by',
      'from',
      'they',
      'we',
      'say',
      'her',
      'she',
      'or',
      'an',
      'will',
      'my',
      'one',
      'all',
      'would',
      'there',
      'their',
      'what',
      'so',
      'up',
      'out',
      'if',
      'about',
      'who',
      'get',
      'which',
      'go',
      'me',
      'when',
      'make',
      'can',
      'like',
      'time',
      'no',
      'just',
      'him',
      'know',
      'take',
      'people',
      'into',
      'year',
      'your',
      'good',
      'some',
      'could',
      'them',
      'see',
      'other',
      'than',
      'then',
      'now',
      'look',
      'only',
      'come',
      'its',
      'over',
      'think',
      'also',
      'back',
      'after',
      'use',
      'two',
      'how',
      'our',
      'work',
      'first',
      'well',
      'way',
      'even',
      'new',
      'want',
      'because',
      'any',
      'these',
      'give',
      'day',
      'most',
      'us',
    ]);

    return stopWords.has(word.toLowerCase());
  }
}
