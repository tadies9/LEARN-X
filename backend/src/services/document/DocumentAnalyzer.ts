import { logger } from '../../utils/logger';

export interface DocumentStructure {
  title?: string;
  sections: Section[];
  metadata: DocumentMetadata;
  contentTypes: ContentTypeDistribution;
  hierarchy: HierarchyNode[];
}

export interface Section {
  id: string;
  title: string;
  level: number; // 1-6 for heading levels
  content: string;
  startIndex: number;
  endIndex: number;
  subsections: Section[];
  contentType?: ContentType;
  keywords?: string[];
}

export interface DocumentMetadata {
  language: string;
  estimatedReadingTime: number; // in minutes
  academicLevel?: 'undergraduate' | 'graduate' | 'professional' | 'general';
  documentType?: 'textbook' | 'research' | 'notes' | 'slides' | 'exam' | 'other';
  hasEquations: boolean;
  hasCode: boolean;
  hasTables: boolean;
  hasFigures: boolean;
}

export interface ContentTypeDistribution {
  definition: number;
  explanation: number;
  example: number;
  theory: number;
  practice: number;
  summary: number;
  other: number;
}

export interface HierarchyNode {
  id: string;
  title: string;
  level: number;
  children: HierarchyNode[];
}

export type ContentType = 
  | 'definition'
  | 'explanation'
  | 'example'
  | 'theory'
  | 'practice'
  | 'summary'
  | 'introduction'
  | 'conclusion'
  | 'question'
  | 'answer'
  | 'code'
  | 'equation'
  | 'list'
  | 'table'
  | 'other';

export class DocumentAnalyzer {
  private readonly HEADING_PATTERNS = [
    /^#{1,6}\s+(.+)$/m, // Markdown headings
    /^Chapter\s+(\d+[\.\:]?\s*.+)$/im,
    /^Section\s+(\d+[\.\:]?\s*.+)$/im,
    /^Unit\s+(\d+[\.\:]?\s*.+)$/im,
    /^Module\s+(\d+[\.\:]?\s*.+)$/im,
    /^Lesson\s+(\d+[\.\:]?\s*.+)$/im,
    /^Part\s+([IVX\d]+[\.\:]?\s*.+)$/im,
    /^(\d+\.?\d*)\s+([A-Z].+)$/m, // Numbered sections
    /^([A-Z][A-Z\s]{2,})$/m, // All caps headings
  ];

  private readonly CONTENT_PATTERNS = {
    definition: [
      /(.+?)\s+(?:is|are|means?|refers?\s+to|can\s+be\s+defined\s+as)\s+(.+)/i,
      /Definition\s*[:：]\s*(.+)/i,
      /^(?:A|An|The)?\s*(.+?)\s*:\s*(.+)$/m,
    ],
    example: [
      /(?:for\s+)?example\s*[:：,]?\s*(.+)/i,
      /(?:for\s+)?instance\s*[:：,]?\s*(.+)/i,
      /e\.g\.\s*[:：,]?\s*(.+)/i,
      /such\s+as\s+(.+)/i,
      /Example\s*\d*\s*[:：]\s*(.+)/i,
    ],
    equation: [
      /\$\$?.+?\$\$?/,
      /\\begin\{equation\}[\s\S]+?\\end\{equation\}/,
      /\\begin\{align\}[\s\S]+?\\end\{align\}/,
      /\\\[[\s\S]+?\\\]/,
    ],
    code: [
      /```[\s\S]+?```/,
      /~~~[\s\S]+?~~~/,
      /^\s{4,}.+$/m,
    ],
    list: [
      /^[\s]*[-*+]\s+.+$/m,
      /^[\s]*\d+\.\s+.+$/m,
      /^[\s]*[a-z]\)\s+.+$/im,
    ],
    question: [
      /^(?:\d+\.\s*)?(?:Q:|Question:?)\s*(.+\?)/im,
      /^(?:\d+\.\s*)?.+\?$/m,
      /What\s+.+\?/i,
      /How\s+.+\?/i,
      /Why\s+.+\?/i,
      /When\s+.+\?/i,
      /Where\s+.+\?/i,
    ],
  };

  analyzeStructure(content: string, fileName?: string): DocumentStructure {
    logger.info('[DocumentAnalyzer] Analyzing document structure', { 
      contentLength: content.length,
      fileName 
    });

    const sections = this.extractSections(content);
    const metadata = this.extractMetadata(content, fileName);
    const contentTypes = this.analyzeContentTypes(content);
    const hierarchy = this.buildHierarchy(sections);

    // Classify content type for each section
    sections.forEach(section => {
      section.contentType = this.classifyContent(section.content);
      section.keywords = this.extractKeywords(section.content);
    });

    return {
      title: this.extractTitle(content, fileName),
      sections,
      metadata,
      contentTypes,
      hierarchy,
    };
  }

  private extractSections(content: string): Section[] {
    const sections: Section[] = [];
    const lines = content.split('\n');
    let currentSection: Section | null = null;
    let currentContent: string[] = [];
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = this.detectHeading(line);

      if (headingMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          currentSection.endIndex = currentIndex;
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          id: `section-${sections.length}`,
          title: headingMatch.title,
          level: headingMatch.level,
          content: '',
          startIndex: currentIndex + line.length + 1,
          endIndex: 0,
          subsections: [],
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }

      currentIndex += line.length + 1; // +1 for newline
    }

    // Save last section
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      currentSection.endIndex = content.length;
      sections.push(currentSection);
    }

    // If no sections found, treat entire content as one section
    if (sections.length === 0 && content.trim()) {
      sections.push({
        id: 'section-0',
        title: 'Main Content',
        level: 1,
        content: content.trim(),
        startIndex: 0,
        endIndex: content.length,
        subsections: [],
      });
    }

    // Build subsection relationships
    this.buildSubsections(sections);

    return sections;
  }

  private detectHeading(line: string): { title: string; level: number } | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Check markdown headings
    const mdMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (mdMatch) {
      return {
        title: mdMatch[2],
        level: mdMatch[1].length,
      };
    }

    // Check chapter/section patterns
    for (const pattern of this.HEADING_PATTERNS.slice(1)) {
      const match = trimmed.match(pattern);
      if (match) {
        // Estimate level based on keyword
        let level = 1;
        if (/^chapter/i.test(trimmed)) level = 1;
        else if (/^section/i.test(trimmed)) level = 2;
        else if (/^subsection/i.test(trimmed)) level = 3;
        else if (/^\d+\.\d+/.test(trimmed)) level = 3;
        else if (/^\d+\./.test(trimmed)) level = 2;

        return {
          title: match[1] || trimmed,
          level,
        };
      }
    }

    // Check if it's a short line in all caps (likely a heading)
    if (trimmed.length < 50 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      return {
        title: trimmed,
        level: 2,
      };
    }

    return null;
  }

  private buildSubsections(sections: Section[]): void {
    const stack: Section[] = [];

    for (const section of sections) {
      // Pop sections from stack that are at same or higher level
      while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
        stack.pop();
      }

      // Add as subsection to parent if exists
      if (stack.length > 0) {
        stack[stack.length - 1].subsections.push(section);
      }

      stack.push(section);
    }
  }

  private extractMetadata(content: string, fileName?: string): DocumentMetadata {
    const wordCount = content.split(/\s+/).length;
    const avgReadingSpeed = 250; // words per minute

    return {
      language: this.detectLanguage(content),
      estimatedReadingTime: Math.ceil(wordCount / avgReadingSpeed),
      academicLevel: this.detectAcademicLevel(content),
      documentType: this.detectDocumentType(content, fileName),
      hasEquations: this.hasPattern(content, this.CONTENT_PATTERNS.equation),
      hasCode: this.hasPattern(content, this.CONTENT_PATTERNS.code),
      hasTables: /\|.+\|.+\|/.test(content) || /<table/i.test(content),
      hasFigures: /!\[.*?\]\(.*?\)/.test(content) || /<img/i.test(content),
    };
  }

  private detectLanguage(_content: string): string {
    // Simple English detection for now
    // Can be extended with proper language detection
    return 'en';
  }

  private detectAcademicLevel(content: string): DocumentMetadata['academicLevel'] {
    const indicators = {
      undergraduate: [
        /introduction\s+to/i,
        /fundamentals?\s+of/i,
        /basics?\s+of/i,
        /principles?\s+of/i,
        /elementary/i,
      ],
      graduate: [
        /advanced/i,
        /thesis/i,
        /dissertation/i,
        /research/i,
        /hypothesis/i,
        /methodology/i,
      ],
      professional: [
        /professional/i,
        /certification/i,
        /compliance/i,
        /regulation/i,
        /standard/i,
      ],
    };

    for (const [level, patterns] of Object.entries(indicators)) {
      if (patterns.some(pattern => pattern.test(content))) {
        return level as DocumentMetadata['academicLevel'];
      }
    }

    return 'general';
  }

  private detectDocumentType(content: string, fileName?: string): DocumentMetadata['documentType'] {
    if (fileName) {
      const lower = fileName.toLowerCase();
      if (lower.includes('exam') || lower.includes('test') || lower.includes('quiz')) {
        return 'exam';
      }
      if (lower.includes('slide') || lower.includes('presentation')) {
        return 'slides';
      }
      if (lower.includes('note')) {
        return 'notes';
      }
    }

    // Content-based detection
    if (/^chapter\s+\d+/im.test(content) || /table\s+of\s+contents/i.test(content)) {
      return 'textbook';
    }
    if (/abstract/i.test(content) && /references/i.test(content)) {
      return 'research';
    }
    if (/question\s+\d+/i.test(content) || /\d+\s+marks?/i.test(content)) {
      return 'exam';
    }

    return 'other';
  }

  private analyzeContentTypes(content: string): ContentTypeDistribution {
    const distribution: ContentTypeDistribution = {
      definition: 0,
      explanation: 0,
      example: 0,
      theory: 0,
      practice: 0,
      summary: 0,
      other: 0,
    };

    const sentences = content.split(/[.!?]+/);
    const totalSentences = sentences.length;

    for (const sentence of sentences) {
      const type = this.classifyContent(sentence);
      switch (type) {
        case 'definition':
          distribution.definition++;
          break;
        case 'example':
          distribution.example++;
          break;
        case 'explanation':
        case 'introduction':
          distribution.explanation++;
          break;
        case 'theory':
          distribution.theory++;
          break;
        case 'question':
        case 'answer':
          distribution.practice++;
          break;
        case 'summary':
        case 'conclusion':
          distribution.summary++;
          break;
        default:
          distribution.other++;
      }
    }

    // Convert to percentages
    Object.keys(distribution).forEach(key => {
      distribution[key as keyof ContentTypeDistribution] = 
        Math.round((distribution[key as keyof ContentTypeDistribution] / totalSentences) * 100);
    });

    return distribution;
  }

  private classifyContent(text: string): ContentType {
    const trimmed = text.trim();
    if (!trimmed) return 'other';

    // Check for specific patterns
    if (this.hasPattern(trimmed, this.CONTENT_PATTERNS.definition)) {
      return 'definition';
    }
    if (this.hasPattern(trimmed, this.CONTENT_PATTERNS.example)) {
      return 'example';
    }
    if (this.hasPattern(trimmed, this.CONTENT_PATTERNS.equation)) {
      return 'equation';
    }
    if (this.hasPattern(trimmed, this.CONTENT_PATTERNS.code)) {
      return 'code';
    }
    if (this.hasPattern(trimmed, this.CONTENT_PATTERNS.question)) {
      return 'question';
    }
    if (this.hasPattern(trimmed, this.CONTENT_PATTERNS.list)) {
      return 'list';
    }

    // Content-based classification
    if (/^(?:in\s+)?(?:summary|conclusion|finally|overall)/i.test(trimmed)) {
      return 'summary';
    }
    if (/^(?:introduction|overview|background)/i.test(trimmed)) {
      return 'introduction';
    }
    if (/(?:therefore|thus|hence|because|since)/i.test(trimmed)) {
      return 'explanation';
    }
    if (/(?:theorem|lemma|corollary|proof|proposition)/i.test(trimmed)) {
      return 'theory';
    }

    return 'other';
  }

  private hasPattern(text: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(text));
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4);

    const stopWords = new Set([
      'about', 'above', 'after', 'again', 'against', 'being',
      'below', 'between', 'through', 'during', 'before', 'after',
      'above', 'below', 'these', 'those', 'there', 'where', 'which',
      'while', 'within', 'without', 'would', 'should', 'could',
    ]);

    const keywords = words
      .filter(word => !stopWords.has(word))
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Return top 5 keywords
    return Object.entries(keywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  private buildHierarchy(sections: Section[]): HierarchyNode[] {
    const hierarchy: HierarchyNode[] = [];
    const stack: { node: HierarchyNode; section: Section }[] = [];

    for (const section of sections) {
      const node: HierarchyNode = {
        id: section.id,
        title: section.title,
        level: section.level,
        children: [],
      };

      // Pop nodes from stack that are at same or higher level
      while (stack.length > 0 && stack[stack.length - 1].section.level >= section.level) {
        stack.pop();
      }

      // Add to parent or root
      if (stack.length > 0) {
        stack[stack.length - 1].node.children.push(node);
      } else {
        hierarchy.push(node);
      }

      stack.push({ node, section });
    }

    return hierarchy;
  }

  private extractTitle(content: string, fileName?: string): string {
    // Try to extract from content
    const lines = content.split('\n').slice(0, 10); // Check first 10 lines
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed.length < 100) {
        // Check if it looks like a title
        if (/^#\s+/.test(trimmed)) {
          return trimmed.replace(/^#\s+/, '');
        }
        if (/^title:\s*/i.test(trimmed)) {
          return trimmed.replace(/^title:\s*/i, '');
        }
        if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
          return trimmed;
        }
      }
    }

    // Fallback to filename
    if (fileName) {
      return fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    }

    return 'Untitled Document';
  }
}