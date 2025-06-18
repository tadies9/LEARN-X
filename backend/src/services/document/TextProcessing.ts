export interface TextCleaningOptions {
  removeExtraWhitespace: boolean;
  normalizeLineBreaks: boolean;
  trimLines: boolean;
  removeEmptyLines: boolean;
  preserveFormatting: boolean;
}

export interface SentenceOptions {
  respectAbbreviations: boolean;
  minimumLength: number;
  splitOnNewlines: boolean;
}

export class TextProcessing {
  private readonly DEFAULT_CLEANING_OPTIONS: TextCleaningOptions = {
    removeExtraWhitespace: true,
    normalizeLineBreaks: true,
    trimLines: true,
    removeEmptyLines: false,
    preserveFormatting: false,
  };

  private readonly DEFAULT_SENTENCE_OPTIONS: SentenceOptions = {
    respectAbbreviations: true,
    minimumLength: 10,
    splitOnNewlines: false,
  };

  private readonly COMMON_ABBREVIATIONS = new Set([
    'Dr', 'Mr', 'Mrs', 'Ms', 'Prof', 'Sr', 'Jr', 'Inc', 'Ltd', 'Co', 'Corp',
    'etc', 'eg', 'ie', 'vs', 'cf', 'al', 'Ave', 'St', 'Rd', 'Blvd',
    'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]);

  cleanText(text: string, options: Partial<TextCleaningOptions> = {}): string {
    const opts = { ...this.DEFAULT_CLEANING_OPTIONS, ...options };
    let cleaned = text;

    // Normalize line breaks
    if (opts.normalizeLineBreaks) {
      cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    // Split into lines for processing
    let lines = cleaned.split('\n');

    // Trim lines
    if (opts.trimLines) {
      lines = lines.map(line => line.trim());
    }

    // Remove empty lines
    if (opts.removeEmptyLines) {
      lines = lines.filter(line => line.length > 0);
    }

    // Rejoin lines
    cleaned = lines.join('\n');

    // Remove extra whitespace
    if (opts.removeExtraWhitespace && !opts.preserveFormatting) {
      // Replace multiple spaces with single space
      cleaned = cleaned.replace(/[ \t]+/g, ' ');
      // Replace multiple newlines with at most double newlines
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    }

    return cleaned.trim();
  }

  splitIntoSentences(text: string, options: Partial<SentenceOptions> = {}): string[] {
    const opts = { ...this.DEFAULT_SENTENCE_OPTIONS, ...options };
    
    // Handle newline splitting if requested
    if (opts.splitOnNewlines) {
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const sentences: string[] = [];
      
      for (const line of lines) {
        sentences.push(...this.splitLineIntoSentences(line, opts));
      }
      
      return sentences.filter(sentence => sentence.length >= opts.minimumLength);
    }

    return this.splitLineIntoSentences(text, opts)
      .filter(sentence => sentence.length >= opts.minimumLength);
  }

  private splitLineIntoSentences(text: string, options: SentenceOptions): string[] {
    // Basic sentence splitting pattern
    const sentencePattern = /[^.!?]+[.!?]+/g;
    const matches = text.match(sentencePattern) || [];
    
    if (matches.length === 0) {
      return text.trim() ? [text.trim()] : [];
    }

    const sentences: string[] = [];
    let buffer = '';
    
    for (const match of matches) {
      buffer += match;
      
      if (this.isCompleteSentence(buffer.trim(), options)) {
        sentences.push(buffer.trim());
        buffer = '';
      }
    }
    
    // Add any remaining text
    const remaining = text.substring(matches.join('').length).trim();
    if (remaining) {
      if (buffer) {
        sentences.push((buffer + remaining).trim());
      } else {
        sentences.push(remaining);
      }
    } else if (buffer) {
      sentences.push(buffer.trim());
    }
    
    return sentences;
  }

  isCompleteSentence(text: string, options: SentenceOptions): boolean {
    if (!text || text.length < options.minimumLength) {
      return false;
    }

    // Check if it ends with proper punctuation
    if (!/[.!?]$/.test(text.trim())) {
      return false;
    }

    // Check for abbreviations if respect abbreviations is enabled
    if (options.respectAbbreviations) {
      const words = text.trim().split(/\s+/);
      const lastWord = words[words.length - 1];
      
      if (lastWord) {
        const withoutPunctuation = lastWord.replace(/[.!?]$/, '');
        if (this.COMMON_ABBREVIATIONS.has(withoutPunctuation)) {
          return false;
        }
      }
    }

    return true;
  }

  extractWords(text: string, options: { 
    minLength?: number; 
    maxLength?: number; 
    includeNumbers?: boolean;
    toLowerCase?: boolean;
  } = {}): string[] {
    const {
      minLength = 1,
      maxLength = Infinity,
      includeNumbers = true,
      toLowerCase = true
    } = options;

    // Extract word-like tokens
    const pattern = includeNumbers ? /\b\w+\b/g : /\b[a-zA-Z]+\b/g;
    const matches = text.match(pattern) || [];
    
    return matches
      .map(word => toLowerCase ? word.toLowerCase() : word)
      .filter(word => word.length >= minLength && word.length <= maxLength);
  }

  extractPhrases(text: string, options: {
    minWords?: number;
    maxWords?: number;
    includePunctuation?: boolean;
  } = {}): string[] {
    const {
      minWords = 2,
      maxWords = 5,
      includePunctuation = false
    } = options;

    const sentences = this.splitIntoSentences(text);
    const phrases: string[] = [];

    for (const sentence of sentences) {
      const words = sentence.split(/\s+/);
      
      // Extract n-grams
      for (let n = minWords; n <= Math.min(maxWords, words.length); n++) {
        for (let i = 0; i <= words.length - n; i++) {
          const phrase = words.slice(i, i + n).join(' ');
          
          if (!includePunctuation) {
            const cleaned = phrase.replace(/[^\w\s]/g, '').trim();
            if (cleaned && cleaned.split(/\s+/).length === n) {
              phrases.push(cleaned);
            }
          } else {
            phrases.push(phrase);
          }
        }
      }
    }

    // Remove duplicates and sort by frequency
    const phraseFreq = new Map<string, number>();
    for (const phrase of phrases) {
      phraseFreq.set(phrase, (phraseFreq.get(phrase) || 0) + 1);
    }

    return Array.from(phraseFreq.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([phrase]) => phrase);
  }

  normalizeWhitespace(text: string): string {
    return text
      .replace(/\s+/g, ' ')  // Multiple spaces to single space
      .replace(/\n\s*\n/g, '\n\n')  // Multiple newlines to double newline
      .trim();
  }

  removeHtmlTags(text: string): string {
    return text.replace(/<[^>]*>/g, '');
  }

  removeMarkdown(text: string): string {
    return text
      // Remove headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold and italic
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove links
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove horizontal rules
      .replace(/^---+$/gm, '')
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '');
  }

  countWords(text: string): number {
    const words = text.match(/\b\w+\b/g);
    return words ? words.length : 0;
  }

  countSentences(text: string): number {
    return this.splitIntoSentences(text).length;
  }

  countParagraphs(text: string): number {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    return paragraphs.length;
  }

  calculateReadabilityMetrics(text: string): {
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    averageWordsPerSentence: number;
    averageSentencesPerParagraph: number;
  } {
    const wordCount = this.countWords(text);
    const sentenceCount = this.countSentences(text);
    const paragraphCount = this.countParagraphs(text);

    return {
      wordCount,
      sentenceCount,
      paragraphCount,
      averageWordsPerSentence: sentenceCount > 0 ? wordCount / sentenceCount : 0,
      averageSentencesPerParagraph: paragraphCount > 0 ? sentenceCount / paragraphCount : 0,
    };
  }

  truncateText(text: string, maxLength: number, ellipsis: string = '...'): string {
    if (text.length <= maxLength) {
      return text;
    }

    // Try to truncate at word boundary
    const truncated = text.substring(0, maxLength - ellipsis.length);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + ellipsis;
    }

    return truncated + ellipsis;
  }

  generateTextPreview(text: string, maxLength: number = 200): string {
    const cleaned = this.cleanText(text, { removeExtraWhitespace: true });
    return this.truncateText(cleaned, maxLength);
  }
}