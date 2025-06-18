import { logger } from '../../utils/logger';
import { DocumentStructure, Section, ContentType } from './DocumentAnalyzer';
import { ChunkingStrategies, ChunkingOptions } from './ChunkingStrategies';
import { ChunkValidation, ValidationResult } from './ChunkValidation';
import { ChunkOptimization, OptimizationOptions } from './ChunkOptimization';
import { ChunkMetadataGenerator, MetadataGenerationOptions } from './ChunkMetadata';

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

  private readonly chunkingStrategies = new ChunkingStrategies();
  private readonly chunkValidation = new ChunkValidation();
  private readonly chunkOptimization = new ChunkOptimization();
  private readonly metadataGenerator = new ChunkMetadataGenerator();

  chunk(content: string, structure: DocumentStructure, options: ChunkOptions = {}): Chunk[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    logger.info('[SemanticChunker] Starting semantic chunking', {
      contentLength: content.length,
      sectionCount: structure.sections.length,
      options: opts,
    });

    let chunks: Chunk[] = [];

    if (opts.preserveStructure && structure.sections.length > 0) {
      chunks = this.chunkByStructure(structure.sections, opts);
    } else {
      chunks = this.chunkByContent(content, structure, opts);
    }

    // Optimize chunks (includes overlap and merging)
    const optimizationOptions: OptimizationOptions = {
      overlapSize: opts.overlapSize,
      enableMerging: true,
      maxMergeSize: opts.maxChunkSize * 1.3,
      minViableSize: opts.minChunkSize * 0.7,
    };
    chunks = this.chunkOptimization.optimizeChunks(chunks, optimizationOptions);

    // Enhance metadata with document-level information
    if (opts.includeMetadata) {
      chunks = this.metadataGenerator.enhanceWithDocumentMetadata(chunks, structure);
    }

    // Validate chunks
    const validation = this.chunkValidation.validateBatch(chunks);
    if (!validation.isValid) {
      logger.warn('[SemanticChunker] Chunk validation warnings', {
        errors: validation.errors,
        warnings: validation.warnings,
      });
    }

    logger.info(`[SemanticChunker] Created ${chunks.length} chunks`);
    return chunks;
  }

  private chunkByStructure(sections: Section[], options: Required<ChunkOptions>): Chunk[] {
    const chunks: Chunk[] = [];
    let globalPosition = 0;

    const processSection = (section: Section, parentTitle?: string) => {
      const sectionChunks = this.chunkSection(section, options, parentTitle);

      sectionChunks.forEach((chunk) => {
        chunk.metadata.position = globalPosition++;
        chunks.push(chunk);
      });

      // Process subsections
      section.subsections.forEach((subsection) => {
        processSection(subsection, section.title);
      });
    };

    sections.forEach((section) => processSection(section));

    return chunks;
  }

  private chunkSection(
    section: Section,
    options: Required<ChunkOptions>,
    parentTitle?: string
  ): Chunk[] {
    const chunks: Chunk[] = [];
    const contentType = section.contentType || 'other';

    // Get adaptive size constraints
    const chunkingOptions: ChunkingOptions = {
      minChunkSize: options.minChunkSize,
      maxChunkSize: options.maxChunkSize,
      adaptiveSize: options.adaptiveSize,
    };
    const sizeConstraints = this.chunkingStrategies.getSizeConstraints(contentType, chunkingOptions);

    // Split section content into semantic units
    const semanticUnits = this.chunkingStrategies.splitIntoSemanticUnits(section.content, contentType);

    let currentChunk = '';
    let unitIndex = 0;

    for (const unit of semanticUnits) {
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + unit;

      if (potentialChunk.length > sizeConstraints.max && currentChunk) {
        chunks.push(
          this.createChunk(currentChunk, section, contentType, parentTitle, unitIndex === 1, false)
        );
        currentChunk = unit;
      } else {
        currentChunk = potentialChunk;
      }

      unitIndex++;
    }

    // Save remaining content
    if (currentChunk) {
      chunks.push(
        this.createChunk(currentChunk, section, contentType, parentTitle, chunks.length === 0, true)
      );
    }

    return chunks;
  }

  private createChunk(
    content: string,
    section: Section,
    contentType: ContentType,
    parentTitle: string | undefined,
    isStart: boolean,
    isEnd: boolean
  ): Chunk {
    const id = `chunk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const metadata = this.metadataGenerator.generateMetadata(
      content,
      section,
      contentType,
      parentTitle,
      isStart,
      isEnd
    );

    return {
      id,
      content: content.trim(),
      metadata,
    };
  }

  // Utility methods for accessing sub-services
  validateChunk(chunk: Chunk): ValidationResult {
    return this.chunkValidation.validateChunk(chunk);
  }

  validateChunks(chunks: Chunk[]): ValidationResult {
    return this.chunkValidation.validateBatch(chunks);
  }

  analyzeChunkSizes(chunks: Chunk[]) {
    return this.chunkOptimization.analyzeChunkSizes(chunks);
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
