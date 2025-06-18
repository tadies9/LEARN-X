import { logger } from '../../utils/logger';
import { DocumentParser } from './DocumentParsers';
import { MetadataExtractor } from './MetadataExtraction';
import { ContentAnalyzer } from './ContentAnalysis';
import { FileTypeManager } from './FileTypeHandlers';

// Import types for use in this module
import type {
  DocumentStructure,
  Section,
} from './StructureAnalysis';

// Re-export types for convenience
export type {
  DocumentStructure,
  Section,
  HierarchyNode,
  ContentType,
} from './StructureAnalysis';
export type { DocumentMetadata } from './MetadataExtraction';
export type { ContentTypeDistribution } from './ContentAnalysis';

export class DocumentAnalyzer {
  private documentParser: DocumentParser;
  private metadataExtractor: MetadataExtractor;
  private contentAnalyzer: ContentAnalyzer;
  private fileTypeManager: FileTypeManager;

  constructor() {
    this.documentParser = new DocumentParser();
    this.metadataExtractor = new MetadataExtractor();
    this.contentAnalyzer = new ContentAnalyzer();
    this.fileTypeManager = new FileTypeManager();
  }

  analyzeStructure(content: string, fileName?: string): DocumentStructure {
    logger.info('[DocumentAnalyzer] Analyzing document structure', {
      contentLength: content.length,
      fileName,
    });

    // Pre-process content through file type handler
    const processedContent = this.fileTypeManager.parseFile(content, fileName);

    // Extract document components using specialized analyzers
    const sections = this.documentParser.extractSections(processedContent);
    const metadata = this.metadataExtractor.extractMetadata(processedContent, fileName);
    const contentTypes = this.contentAnalyzer.analyzeContentTypes(processedContent);
    const hierarchy = this.documentParser.buildHierarchy(sections);

    // Enhance sections with content analysis
    this.enhanceSections(sections);

    return {
      title: this.documentParser.extractTitle(processedContent, fileName),
      sections,
      metadata,
      contentTypes,
      hierarchy,
    };
  }

  private enhanceSections(sections: Section[]): void {
    sections.forEach((section) => {
      section.contentType = this.contentAnalyzer.classifyContent(section.content);
      section.keywords = this.contentAnalyzer.extractKeywords(section.content);
      
      // Recursively enhance subsections
      if (section.subsections.length > 0) {
        this.enhanceSections(section.subsections);
      }
    });
  }
}
