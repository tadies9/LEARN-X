import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { DocumentAnalyzer } from './document/DocumentAnalyzer';
import { SemanticChunker, ChunkOptions } from './document/SemanticChunker';

interface FileMetadata {
  wordCount: number;
  pageCount?: number;
  language?: string;
  extractedTitle?: string;
  extractedAuthor?: string;
  extractedDate?: string;
  topics?: string[];
  documentType?: string;
  academicLevel?: string;
  contentDistribution?: Record<string, number>;
}

export class EnhancedFileProcessingService {
  private documentAnalyzer: DocumentAnalyzer;
  private semanticChunker: SemanticChunker;

  constructor() {
    this.documentAnalyzer = new DocumentAnalyzer();
    this.semanticChunker = new SemanticChunker();
  }

  async extractPdfText(filePath: string): Promise<string> {
    try {
      logger.info(`[FileProcessing] Downloading PDF from storage: ${filePath}`);

      // Download file from Supabase Storage
      const { data, error } = await supabase.storage.from('course-files').download(filePath);

      if (error) {
        logger.error('[FileProcessing] Supabase download error:', error);
        throw new Error(`Failed to download file: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from storage');
      }

      // Convert blob to buffer
      const buffer = Buffer.from(await data.arrayBuffer());
      logger.info(`[FileProcessing] Downloaded file size: ${buffer.length} bytes`);

      // Extract text from PDF
      const pdfData = await pdf(buffer);
      logger.info(`[FileProcessing] Extracted ${pdfData.text.length} characters from PDF`);

      // Sanitize Unicode characters to prevent database insertion errors
      const sanitizedText = this.sanitizeUnicodeText(pdfData.text);
      logger.info(`[FileProcessing] Text sanitized, final length: ${sanitizedText.length} characters`);

      return sanitizedText;
    } catch (error) {
      logger.error('[FileProcessing] Error extracting PDF text:', error);
      throw new Error('Failed to extract PDF text');
    }
  }

  async extractWordText(filePath: string): Promise<string> {
    try {
      logger.info(`[FileProcessing] Downloading Word document from storage: ${filePath}`);

      // Download file from Supabase Storage
      const { data, error } = await supabase.storage.from('course-files').download(filePath);

      if (error) {
        logger.error('[FileProcessing] Supabase download error:', error);
        throw new Error(`Failed to download file: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from storage');
      }

      // Convert blob to buffer
      const buffer = Buffer.from(await data.arrayBuffer());
      logger.info(`[FileProcessing] Downloaded file size: ${buffer.length} bytes`);

      // Extract text from Word document
      const result = await mammoth.extractRawText({ buffer });
      logger.info(
        `[FileProcessing] Extracted ${result.value.length} characters from Word document`
      );

      // Sanitize Unicode characters to prevent database insertion errors
      const sanitizedText = this.sanitizeUnicodeText(result.value);
      logger.info(`[FileProcessing] Text sanitized, final length: ${sanitizedText.length} characters`);

      return sanitizedText;
    } catch (error) {
      logger.error('[FileProcessing] Error extracting Word text:', error);
      throw new Error('Failed to extract Word document text');
    }
  }

  async extractPlainText(filePath: string): Promise<string> {
    try {
      // Download file from Supabase Storage
      const { data, error } = await supabase.storage.from('course-files').download(filePath);

      if (error || !data) {
        throw new Error('Failed to download file');
      }

      // Convert blob to text
      const text = await data.text();

      // Sanitize Unicode characters to prevent database insertion errors
      const sanitizedText = this.sanitizeUnicodeText(text);

      return sanitizedText;
    } catch (error) {
      logger.error('[FileProcessing] Error extracting plain text:', error);
      throw new Error('Failed to extract plain text');
    }
  }

  /**
   * Public method to sanitize chunk content before database insertion
   */
  public sanitizeChunkContent(text: string): string {
    return this.sanitizeUnicodeText(text);
  }

  /**
   * Sanitizes text to remove problematic Unicode characters that cause database insertion errors
   */
  private sanitizeUnicodeText(text: string): string {
    try {
      // Start with basic null byte removal
      let sanitized = text.replace(/\0/g, '');
      
      // ULTRA AGGRESSIVE: Remove ALL backslashes that aren't standard escapes
      // This will catch any backslash-u sequences that PostgreSQL might interpret
      sanitized = sanitized.replace(/\\/g, (match, offset, string) => {
        const nextChar = string[offset + 1];
        // Only keep standard JSON/SQL escape sequences
        if (['n', 'r', 't', 'b', 'f', 'a', 'v', '"', "'", '\\'].includes(nextChar)) {
          return match;
        }
        // Remove any other backslash sequences entirely
        return '';
      });
      
      // Remove other problematic control characters (using character class ranges)
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // Replace multiple whitespace with single space
      sanitized = sanitized.replace(/\s+/g, ' ');
      
      // Normalize Unicode characters to canonical form
      sanitized = sanitized.normalize('NFC');
      
      // Remove any remaining null bytes or non-printable characters
      sanitized = sanitized.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      
      // Final safety check - replace any remaining problematic sequences
      sanitized = sanitized.replace(/[\uFFFD]/g, ''); // Remove replacement characters
      
      // Extra safety: JSON stringify and parse to ensure no problematic sequences
      try {
        const jsonTest = JSON.stringify(sanitized);
        sanitized = JSON.parse(jsonTest);
      } catch (jsonError) {
        logger.warn('[FileProcessing] JSON test failed, using fallback sanitization');
        sanitized = sanitized.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, ' ');
      }
      
      logger.info(`[FileProcessing] Text sanitization completed. Original length: ${text.length}, Sanitized length: ${sanitized.length}`);
      
      return sanitized.trim();
    } catch (error) {
      logger.error('[FileProcessing] Error during text sanitization:', error);
      // Return a heavily sanitized version as fallback
      return text
        .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, ' ') // Keep only printable ASCII and Unicode
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  async extractMetadata(content: string, fileName: string): Promise<FileMetadata> {
    // Use document analyzer for comprehensive metadata
    const structure = this.documentAnalyzer.analyzeStructure(content, fileName);

    const metadata: FileMetadata = {
      wordCount: content.split(/\s+/).filter((word) => word.length > 0).length,
      pageCount: structure.sections.length > 0 ? Math.ceil(structure.sections.length / 3) : 1,
      language: structure.metadata.language,
      extractedTitle: structure.title,
      documentType: structure.metadata.documentType,
      academicLevel: structure.metadata.academicLevel,
      contentDistribution: structure.contentTypes as any,
    };

    // Extract additional metadata
    metadata.extractedAuthor = this.extractAuthor(content);
    metadata.extractedDate = this.extractDate(content);
    metadata.topics = this.extractTopics(structure);

    return metadata;
  }

  async chunkContent(content: string, fileName: string, options?: ChunkOptions): Promise<any[]> {
    logger.info('[FileProcessing] Starting semantic chunking');

    // Analyze document structure
    const structure = this.documentAnalyzer.analyzeStructure(content, fileName);

    logger.info('[FileProcessing] Document analysis complete', {
      sections: structure.sections.length,
      documentType: structure.metadata.documentType,
      academicLevel: structure.metadata.academicLevel,
    });

    // Apply semantic chunking
    const chunks = this.semanticChunker.chunk(content, structure, {
      minChunkSize: 200,
      maxChunkSize: 1500,
      overlapSize: 50,
      preserveStructure: true,
      adaptiveSize: true,
      includeMetadata: true,
      ...options,
    });

    logger.info(`[FileProcessing] Created ${chunks.length} semantic chunks`);

    // Transform chunks to match expected format
    return chunks.map((chunk, index) => ({
      content: chunk.content,
      metadata: chunk.metadata,
      chunk_metadata: {
        ...chunk.metadata,
        chunk_index: index,
        semantic_type: chunk.metadata.type,
        hierarchy_level: chunk.metadata.hierarchyLevel,
        importance: chunk.metadata.importance,
        concepts: chunk.metadata.concepts,
        keywords: chunk.metadata.keywords,
        section_title: chunk.metadata.sectionTitle,
        is_start_of_section: chunk.metadata.isStartOfSection,
        is_end_of_section: chunk.metadata.isEndOfSection,
      },
      chunk_type: chunk.metadata.type,
      hierarchy_level: chunk.metadata.hierarchyLevel,
    }));
  }

  private extractAuthor(content: string): string | undefined {
    // Look for common author patterns
    const authorPatterns = [
      /(?:by|author|written by)[\s:]+([A-Z][a-z]+ [A-Z][a-z]+)/i,
      /^([A-Z][a-z]+ [A-Z][a-z]+)\s*$/m,
    ];

    for (const pattern of authorPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private extractDate(content: string): string | undefined {
    // Look for date patterns
    const datePatterns = [
      /(?:date|published|created)[\s:]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
      /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i,
    ];

    for (const pattern of datePatterns) {
      const match = content.match(pattern);
      if (match && match[0]) {
        return match[0].trim();
      }
    }

    return undefined;
  }

  private extractTopics(structure: any): string[] {
    const topics: string[] = [];

    // Extract topics from section titles
    structure.sections.forEach((section: any) => {
      if (section.keywords && section.keywords.length > 0) {
        topics.push(...section.keywords);
      }
    });

    // Extract main concepts
    const concepts = new Set<string>();
    structure.sections.forEach((section: any) => {
      if (section.title && !section.title.match(/^(chapter|section|unit)\s+\d+/i)) {
        concepts.add(section.title);
      }
    });

    topics.push(...Array.from(concepts));

    // Deduplicate and return top topics
    return [...new Set(topics)].slice(0, 10);
  }

  // Backward compatibility methods
  async extractMetadataLegacy(content: string, fileName: string): Promise<any> {
    return this.extractMetadata(content, fileName);
  }

  async chunkContentLegacy(content: string, chunkSize: number = 1000): Promise<any[]> {
    // Use simple chunking for backward compatibility
    const chunks: any[] = [];
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];

    let currentChunk = '';
    let startIndex = 0;

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            startIndex,
            endIndex: startIndex + currentChunk.length,
          },
        });
        currentChunk = sentence;
        startIndex = startIndex + currentChunk.length;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          startIndex,
          endIndex: content.length,
        },
      });
    }

    return chunks;
  }
}
