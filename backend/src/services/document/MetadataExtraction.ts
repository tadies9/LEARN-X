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

export class MetadataExtractor {
  private readonly EQUATION_PATTERNS = [
    /\$\$?.+?\$\$?/,
    /\\begin\{equation\}[\s\S]+?\\end\{equation\}/,
    /\\begin\{align\}[\s\S]+?\\end\{align\}/,
    /\\\[[\s\S]+?\\\]/,
  ];

  private readonly CODE_PATTERNS = [/```[\s\S]+?```/, /~~~[\s\S]+?~~~/, /^\s{4,}.+$/m];

  extractMetadata(content: string, fileName?: string): DocumentMetadata {
    const wordCount = content.split(/\s+/).length;
    const avgReadingSpeed = 250; // words per minute

    return {
      language: this.detectLanguage(content),
      estimatedReadingTime: Math.ceil(wordCount / avgReadingSpeed),
      academicLevel: this.detectAcademicLevel(content),
      documentType: this.detectDocumentType(content, fileName),
      hasEquations: this.hasPattern(content, this.EQUATION_PATTERNS),
      hasCode: this.hasPattern(content, this.CODE_PATTERNS),
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
      professional: [/professional/i, /certification/i, /compliance/i, /regulation/i, /standard/i],
    };

    for (const [level, patterns] of Object.entries(indicators)) {
      if (patterns.some((pattern) => pattern.test(content))) {
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

  private hasPattern(text: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(text));
  }
}
