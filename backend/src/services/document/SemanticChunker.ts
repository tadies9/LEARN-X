import { logger } from '../../utils/logger';
import { DocumentStructure, Section, ContentType } from './DocumentAnalyzer';

export interface ChunkOptions {
  minChunkSize?: number;
  maxChunkSize?: number;
  overlapSize?: number;
  preserveStructure?: boolean;
  adaptiveSize?: boolean;
  includeMetadata?: boolean;
}

export interface Chunk {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  embedding?: number[];
}

export interface ChunkMetadata {
  type: ContentType;
  hierarchyLevel: number;
  sectionTitle?: string;
  sectionId?: string;
  keywords?: string[];
  position: number;
  totalChunks?: number;
  isStartOfSection?: boolean;
  isEndOfSection?: boolean;
  previousChunkId?: string;
  nextChunkId?: string;
  concepts?: string[];
  references?: string[];
  importance?: 'high' | 'medium' | 'low';
  academicLevel?: string;
}

export class SemanticChunker {
  private readonly DEFAULT_OPTIONS: Required<ChunkOptions> = {
    minChunkSize: 200,
    maxChunkSize: 1500,
    overlapSize: 100,
    preserveStructure: true,
    adaptiveSize: true,
    includeMetadata: true,
  };

  private readonly ADAPTIVE_SIZES: Record<ContentType, { min: number; max: number }> = {
    definition: { min: 100, max: 500 },
    example: { min: 200, max: 800 },
    explanation: { min: 300, max: 1200 },
    theory: { min: 400, max: 1500 },
    practice: { min: 200, max: 1000 },
    summary: { min: 200, max: 800 },
    introduction: { min: 300, max: 1000 },
    conclusion: { min: 200, max: 800 },
    question: { min: 100, max: 400 },
    answer: { min: 200, max: 1000 },
    code: { min: 100, max: 2000 },
    equation: { min: 50, max: 300 },
    list: { min: 100, max: 600 },
    table: { min: 200, max: 1000 },
    other: { min: 200, max: 1000 },
  };

  chunk(
    content: string,
    structure: DocumentStructure,
    options: ChunkOptions = {}
  ): Chunk[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    logger.info('[SemanticChunker] Starting semantic chunking', {
      contentLength: content.length,
      sectionCount: structure.sections.length,
      options: opts,
    });

    let chunks: Chunk[] = [];

    if (opts.preserveStructure && structure.sections.length > 0) {
      // Chunk based on document structure
      chunks = this.chunkByStructure(structure.sections, opts);
    } else {
      // Fallback to content-based chunking
      chunks = this.chunkByContent(content, structure, opts);
    }

    // Add overlap between chunks
    if (opts.overlapSize > 0) {
      chunks = this.addOverlap(chunks, opts.overlapSize);
    }

    // Add navigation metadata
    chunks = this.addNavigationMetadata(chunks);

    // Enhance metadata with document-level information
    if (opts.includeMetadata) {
      chunks = this.enhanceMetadata(chunks, structure);
    }

    logger.info(`[SemanticChunker] Created ${chunks.length} chunks`);
    return chunks;
  }

  private chunkByStructure(sections: Section[], options: Required<ChunkOptions>): Chunk[] {
    const chunks: Chunk[] = [];
    let globalPosition = 0;

    const processSection = (section: Section, parentTitle?: string) => {
      const sectionChunks = this.chunkSection(section, options, parentTitle);
      
      sectionChunks.forEach(chunk => {
        chunk.metadata.position = globalPosition++;
        chunks.push(chunk);
      });

      // Process subsections
      section.subsections.forEach(subsection => {
        processSection(subsection, section.title);
      });
    };

    sections.forEach(section => processSection(section));

    return chunks;
  }

  private chunkSection(
    section: Section,
    options: Required<ChunkOptions>,
    parentTitle?: string
  ): Chunk[] {
    const chunks: Chunk[] = [];
    const contentType = section.contentType || 'other';
    
    // Get adaptive size for this content type
    const sizeConstraints = options.adaptiveSize
      ? this.ADAPTIVE_SIZES[contentType]
      : { min: options.minChunkSize, max: options.maxChunkSize };

    // Split section content into semantic units
    const semanticUnits = this.splitIntoSemanticUnits(section.content, contentType);
    
    let currentChunk = '';
    let unitIndex = 0;

    for (const unit of semanticUnits) {
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + unit;
      
      if (potentialChunk.length > sizeConstraints.max && currentChunk) {
        // Save current chunk
        chunks.push(this.createChunk(
          currentChunk,
          section,
          contentType,
          parentTitle,
          unitIndex === 1,
          false
        ));
        currentChunk = unit;
      } else if (potentialChunk.length >= sizeConstraints.min) {
        currentChunk = potentialChunk;
      } else {
        currentChunk = potentialChunk;
      }
      
      unitIndex++;
    }

    // Save remaining content
    if (currentChunk) {
      chunks.push(this.createChunk(
        currentChunk,
        section,
        contentType,
        parentTitle,
        chunks.length === 0,
        true
      ));
    }

    return chunks;
  }

  private splitIntoSemanticUnits(content: string, contentType: ContentType): string[] {
    const units: string[] = [];
    
    switch (contentType) {
      case 'code':
        // Split by code blocks
        units.push(...this.splitCodeContent(content));
        break;
        
      case 'list':
        // Split by list items
        units.push(...this.splitListContent(content));
        break;
        
      case 'equation':
        // Keep equations together
        units.push(content);
        break;
        
      case 'definition':
        // Split by sentences but keep definitions together
        units.push(...this.splitDefinitionContent(content));
        break;
        
      default:
        // Split by paragraphs, then sentences if needed
        units.push(...this.splitByParagraphsAndSentences(content));
    }

    return units.filter(unit => unit.trim().length > 0);
  }

  private splitCodeContent(content: string): string[] {
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    const nonCodeParts = content.split(/```[\s\S]*?```/);
    
    const units: string[] = [];
    for (let i = 0; i < nonCodeParts.length; i++) {
      if (nonCodeParts[i].trim()) {
        units.push(...this.splitByParagraphsAndSentences(nonCodeParts[i]));
      }
      if (i < codeBlocks.length) {
        units.push(codeBlocks[i]);
      }
    }
    
    return units;
  }

  private splitListContent(content: string): string[] {
    const lines = content.split('\n');
    const units: string[] = [];
    let currentList: string[] = [];
    let inList = false;

    for (const line of lines) {
      const isListItem = /^[\s]*[-*+•]\s+|^[\s]*\d+[.)]\s+|^[\s]*[a-z][.)]\s+/i.test(line);
      
      if (isListItem) {
        currentList.push(line);
        inList = true;
      } else if (inList && line.trim() === '') {
        // Empty line might end the list
        if (currentList.length > 0) {
          units.push(currentList.join('\n'));
          currentList = [];
        }
        inList = false;
      } else if (!inList) {
        units.push(line);
      } else {
        // Continuation of list item
        currentList.push(line);
      }
    }

    if (currentList.length > 0) {
      units.push(currentList.join('\n'));
    }

    return units;
  }

  private splitDefinitionContent(content: string): string[] {
    // Keep definitions as single units
    const sentences = this.splitIntoSentences(content);
    const units: string[] = [];
    let currentDefinition = '';

    for (const sentence of sentences) {
      if (this.isDefinitionSentence(sentence)) {
        if (currentDefinition) {
          units.push(currentDefinition);
        }
        currentDefinition = sentence;
      } else if (currentDefinition) {
        // Add explanation to definition
        currentDefinition += ' ' + sentence;
      } else {
        units.push(sentence);
      }
    }

    if (currentDefinition) {
      units.push(currentDefinition);
    }

    return units;
  }

  private splitByParagraphsAndSentences(content: string): string[] {
    const paragraphs = content.split(/\n\n+/);
    const units: string[] = [];

    for (const paragraph of paragraphs) {
      if (paragraph.length < 500) {
        units.push(paragraph);
      } else {
        // Split long paragraphs by sentences
        const sentences = this.splitIntoSentences(paragraph);
        let currentUnit = '';
        
        for (const sentence of sentences) {
          const potential = currentUnit + (currentUnit ? ' ' : '') + sentence;
          if (potential.length > 400 && currentUnit) {
            units.push(currentUnit);
            currentUnit = sentence;
          } else {
            currentUnit = potential;
          }
        }
        
        if (currentUnit) {
          units.push(currentUnit);
        }
      }
    }

    return units;
  }

  private splitIntoSentences(text: string): string[] {
    // Improved sentence splitting that handles abbreviations
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const refined: string[] = [];
    let buffer = '';

    for (const sentence of sentences) {
      buffer += sentence;
      
      // Check if this is likely a complete sentence
      if (this.isCompleteSentence(buffer)) {
        refined.push(buffer.trim());
        buffer = '';
      }
    }

    if (buffer) {
      refined.push(buffer.trim());
    }

    return refined;
  }

  private isCompleteSentence(text: string): boolean {
    // Check for common abbreviations that don't end sentences
    const abbreviations = /\b(?:Dr|Mr|Mrs|Ms|Prof|Sr|Jr|Inc|Ltd|Co|Corp|etc|eg|ie|vs|cf)\.\s*$/i;
    if (abbreviations.test(text)) {
      return false;
    }

    // Check if it ends with proper punctuation
    return /[.!?]$/.test(text);
  }

  private isDefinitionSentence(sentence: string): boolean {
    const patterns = [
      /\b(?:is|are|means?|refers?\s+to|can\s+be\s+defined\s+as)\b/i,
      /^[A-Z][^:]+:\s+/,
      /\bdefinition\b/i,
    ];
    
    return patterns.some(pattern => pattern.test(sentence));
  }

  private createChunk(
    content: string,
    section: Section,
    contentType: ContentType,
    _parentTitle: string | undefined,
    isStart: boolean,
    isEnd: boolean
  ): Chunk {
    const id = `chunk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id,
      content: content.trim(),
      metadata: {
        type: contentType,
        hierarchyLevel: section.level,
        sectionTitle: section.title,
        sectionId: section.id,
        keywords: section.keywords,
        position: 0, // Will be set later
        isStartOfSection: isStart,
        isEndOfSection: isEnd,
        importance: this.calculateImportance(content, contentType),
        concepts: this.extractConcepts(content),
        references: this.extractReferences(content),
      },
    };
  }

  private calculateImportance(content: string, contentType: ContentType): 'high' | 'medium' | 'low' {
    // High importance for definitions, summaries, and introductions
    if (['definition', 'summary', 'introduction', 'conclusion'].includes(contentType)) {
      return 'high';
    }

    // Check for importance indicators
    const highImportanceIndicators = [
      /\b(?:important|crucial|essential|fundamental|key|critical|significant)\b/i,
      /\b(?:must|should|need\s+to|have\s+to|required)\b/i,
      /\b(?:note|remember|recall|caution|warning)\b/i,
    ];

    if (highImportanceIndicators.some(pattern => pattern.test(content))) {
      return 'high';
    }

    // Examples and practice problems are medium importance
    if (['example', 'practice', 'question'].includes(contentType)) {
      return 'medium';
    }

    return 'low';
  }

  private extractConcepts(content: string): string[] {
    // Extract important concepts (capitalized phrases, technical terms)
    const concepts: string[] = [];
    
    // Extract capitalized phrases (likely proper nouns or important concepts)
    const capitalizedPhrases = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
    concepts.push(...capitalizedPhrases);

    // Extract quoted terms
    const quotedTerms = content.match(/["']([^"']+)["']/g) || [];
    concepts.push(...quotedTerms.map(term => term.replace(/["']/g, '')));

    // Extract terms in parentheses (often abbreviations or clarifications)
    const parentheticalTerms = content.match(/\(([^)]+)\)/g) || [];
    concepts.push(...parentheticalTerms.map(term => term.replace(/[()]/g, '')));

    // Deduplicate and filter
    return [...new Set(concepts)]
      .filter(concept => concept.length > 2 && concept.length < 50)
      .slice(0, 10);
  }

  private extractReferences(content: string): string[] {
    const references: string[] = [];

    // Extract citations (e.g., [1], (Smith, 2020))
    const citations = content.match(/\[[^\]]+\]|\([^)]+\d{4}[^)]*\)/g) || [];
    references.push(...citations);

    // Extract figure/table references
    const figureRefs = content.match(/\b(?:Figure|Fig\.|Table|Equation|Eq\.)\s+\S+/gi) || [];
    references.push(...figureRefs);

    return [...new Set(references)];
  }

  private addOverlap(chunks: Chunk[], overlapSize: number): Chunk[] {
    const overlappedChunks: Chunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      let content = chunk.content;

      // Add overlap from previous chunk
      if (i > 0) {
        const prevContent = chunks[i - 1].content;
        const prevWords = prevContent.split(/\s+/);
        const overlapWords = prevWords.slice(-Math.min(overlapSize, prevWords.length));
        content = overlapWords.join(' ') + '\n\n' + content;
      }

      // Add overlap from next chunk
      if (i < chunks.length - 1) {
        const nextContent = chunks[i + 1].content;
        const nextWords = nextContent.split(/\s+/);
        const overlapWords = nextWords.slice(0, Math.min(overlapSize, nextWords.length));
        content = content + '\n\n' + overlapWords.join(' ');
      }

      overlappedChunks.push({
        ...chunk,
        content,
      });
    }

    return overlappedChunks;
  }

  private addNavigationMetadata(chunks: Chunk[]): Chunk[] {
    return chunks.map((chunk, index) => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        totalChunks: chunks.length,
        previousChunkId: index > 0 ? chunks[index - 1].id : undefined,
        nextChunkId: index < chunks.length - 1 ? chunks[index + 1].id : undefined,
      },
    }));
  }

  private enhanceMetadata(chunks: Chunk[], structure: DocumentStructure): Chunk[] {
    return chunks.map(chunk => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        academicLevel: structure.metadata.academicLevel,
      },
    }));
  }

  private chunkByContent(
    content: string,
    _structure: DocumentStructure,
    options: Required<ChunkOptions>
  ): Chunk[] {
    // Fallback chunking when no structure is available
    const chunks: Chunk[] = [];
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const potential = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
      
      if (potential.length > options.maxChunkSize && currentChunk) {
        chunks.push({
          id: `chunk-${chunkIndex++}`,
          content: currentChunk,
          metadata: {
            type: 'other',
            hierarchyLevel: 1,
            position: chunks.length,
            importance: 'medium',
          },
        });
        currentChunk = paragraph;
      } else {
        currentChunk = potential;
      }
    }

    if (currentChunk) {
      chunks.push({
        id: `chunk-${chunkIndex}`,
        content: currentChunk,
        metadata: {
          type: 'other',
          hierarchyLevel: 1,
          position: chunks.length,
          importance: 'medium',
        },
      });
    }

    return chunks;
  }
}