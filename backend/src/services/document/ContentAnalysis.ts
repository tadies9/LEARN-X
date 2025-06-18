import type { ContentType } from './StructureAnalysis';

export interface ContentTypeDistribution {
  definition: number;
  explanation: number;
  example: number;
  theory: number;
  practice: number;
  summary: number;
  other: number;
}

export class ContentAnalyzer {
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
    code: [/```[\s\S]+?```/, /~~~[\s\S]+?~~~/, /^\s{4,}.+$/m],
    list: [/^[\s]*[-*+]\s+.+$/m, /^[\s]*\d+\.\s+.+$/m, /^[\s]*[a-z]\)\s+.+$/im],
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

  analyzeContentTypes(content: string): ContentTypeDistribution {
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
    Object.keys(distribution).forEach((key) => {
      distribution[key as keyof ContentTypeDistribution] = Math.round(
        (distribution[key as keyof ContentTypeDistribution] / totalSentences) * 100
      );
    });

    return distribution;
  }

  classifyContent(text: string): ContentType {
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

  extractKeywords(text: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 4);

    const stopWords = new Set([
      'about',
      'above',
      'after',
      'again',
      'against',
      'being',
      'below',
      'between',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'these',
      'those',
      'there',
      'where',
      'which',
      'while',
      'within',
      'without',
      'would',
      'should',
      'could',
    ]);

    const keywords = words
      .filter((word) => !stopWords.has(word))
      .reduce(
        (acc, word) => {
          acc[word] = (acc[word] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

    // Return top 5 keywords
    return Object.entries(keywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  private hasPattern(text: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(text));
  }
}