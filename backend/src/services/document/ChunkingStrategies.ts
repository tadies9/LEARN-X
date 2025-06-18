import { ContentType } from './DocumentAnalyzer';

export interface ChunkingOptions {
  minChunkSize: number;
  maxChunkSize: number;
  adaptiveSize: boolean;
}

export interface SizeConstraints {
  min: number;
  max: number;
}

export class ChunkingStrategies {
  private readonly ADAPTIVE_SIZES: Record<ContentType, SizeConstraints> = {
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

  getSizeConstraints(contentType: ContentType, options: ChunkingOptions): SizeConstraints {
    return options.adaptiveSize
      ? this.ADAPTIVE_SIZES[contentType]
      : { min: options.minChunkSize, max: options.maxChunkSize };
  }

  splitIntoSemanticUnits(content: string, contentType: ContentType): string[] {
    const units: string[] = [];

    switch (contentType) {
      case 'code':
        units.push(...this.splitCodeContent(content));
        break;
      case 'list':
        units.push(...this.splitListContent(content));
        break;
      case 'equation':
        units.push(content);
        break;
      case 'definition':
        units.push(...this.splitDefinitionContent(content));
        break;
      default:
        units.push(...this.splitByParagraphsAndSentences(content));
    }

    return units.filter((unit) => unit.trim().length > 0);
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
        if (currentList.length > 0) {
          units.push(currentList.join('\n'));
          currentList = [];
        }
        inList = false;
      } else if (!inList) {
        units.push(line);
      } else {
        currentList.push(line);
      }
    }

    if (currentList.length > 0) {
      units.push(currentList.join('\n'));
    }

    return units;
  }

  private splitDefinitionContent(content: string): string[] {
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
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const refined: string[] = [];
    let buffer = '';

    for (const sentence of sentences) {
      buffer += sentence;

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
    const abbreviations = /\b(?:Dr|Mr|Mrs|Ms|Prof|Sr|Jr|Inc|Ltd|Co|Corp|etc|eg|ie|vs|cf)\.\s*$/i;
    if (abbreviations.test(text)) {
      return false;
    }

    return /[.!?]$/.test(text);
  }

  private isDefinitionSentence(sentence: string): boolean {
    const patterns = [
      /\b(?:is|are|means?|refers?\s+to|can\s+be\s+defined\s+as)\b/i,
      /^[A-Z][^:]+:\s+/,
      /\bdefinition\b/i,
    ];

    return patterns.some((pattern) => pattern.test(sentence));
  }
}
