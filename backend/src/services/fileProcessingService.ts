import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

interface ChunkMetadata {
  startIndex: number;
  endIndex: number;
  pageNumber?: number;
  section?: string;
}

interface ContentChunk {
  id?: string;
  content: string;
  metadata: ChunkMetadata;
}

interface FileMetadata {
  wordCount: number;
  pageCount?: number;
  language?: string;
  extractedTitle?: string;
  extractedAuthor?: string;
  extractedDate?: string;
  topics?: string[];
}

export class FileProcessingService {
  async extractPdfText(filePath: string): Promise<string> {
    try {
      logger.info(`Downloading PDF from storage: ${filePath}`);

      // Download file from Supabase Storage
      const { data, error } = await supabase.storage.from('course-files').download(filePath);

      if (error) {
        logger.error('Supabase download error:', error);
        throw new Error(`Failed to download file: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from storage');
      }

      // Convert blob to buffer
      const buffer = Buffer.from(await data.arrayBuffer());
      logger.info(`Downloaded file size: ${buffer.length} bytes`);

      // Extract text from PDF
      const pdfData = await pdf(buffer);
      logger.info(`Extracted ${pdfData.text.length} characters from PDF`);

      return pdfData.text;
    } catch (error) {
      logger.error('Error extracting PDF text:', error);
      throw new Error('Failed to extract PDF text');
    }
  }

  async extractWordText(filePath: string): Promise<string> {
    try {
      logger.info(`Downloading Word document from storage: ${filePath}`);

      // Download file from Supabase Storage
      const { data, error } = await supabase.storage.from('course-files').download(filePath);

      if (error) {
        logger.error('Supabase download error:', error);
        throw new Error(`Failed to download file: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from storage');
      }

      // Convert blob to buffer
      const buffer = Buffer.from(await data.arrayBuffer());
      logger.info(`Downloaded file size: ${buffer.length} bytes`);

      // Extract text from Word document
      const result = await mammoth.extractRawText({ buffer });
      logger.info(`Extracted ${result.value.length} characters from Word document`);

      return result.value;
    } catch (error) {
      logger.error('Error extracting Word text:', error);
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

      return text;
    } catch (error) {
      logger.error('Error extracting plain text:', error);
      throw new Error('Failed to extract plain text');
    }
  }

  async extractMetadata(content: string, fileName: string): Promise<FileMetadata> {
    const metadata: FileMetadata = {
      wordCount: this.countWords(content),
    };

    // Extract title from filename or content
    metadata.extractedTitle = this.extractTitle(content, fileName);

    // Try to extract author
    metadata.extractedAuthor = this.extractAuthor(content);

    // Try to extract date
    metadata.extractedDate = this.extractDate(content);

    // Extract main topics (simplified version)
    metadata.topics = this.extractTopics(content);

    // Detect language (simplified)
    metadata.language = this.detectLanguage(content);

    return metadata;
  }

  async chunkContent(content: string, chunkSize: number = 1000): Promise<ContentChunk[]> {
    const chunks: ContentChunk[] = [];
    const sentences = this.splitIntoSentences(content);

    let currentChunk = '';
    let currentSentences: string[] = [];
    let startIndex = 0;

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            startIndex,
            endIndex: startIndex + currentChunk.length,
          },
        });

        // Start new chunk with overlap
        const overlap = Math.min(2, currentSentences.length);
        currentSentences = currentSentences.slice(-overlap);
        currentChunk = currentSentences.join(' ') + ' ' + sentence;
        startIndex = startIndex + currentChunk.length - sentence.length;
        currentSentences.push(sentence);
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentSentences.push(sentence);
      }
    }

    // Add last chunk
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

  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting (can be improved with NLP libraries)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
  }

  private extractTitle(content: string, fileName: string): string {
    // Try to extract from first few lines
    const lines = content.split('\n').slice(0, 5);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && trimmed.length < 200 && !trimmed.includes('.')) {
        return trimmed;
      }
    }

    // Fallback to filename
    return fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
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

  private extractTopics(content: string): string[] {
    // Very simplified topic extraction
    // In a real implementation, you might use NLP libraries
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();

    // Count word frequencies
    for (const word of words) {
      if (word.length > 5 && !this.isCommonWord(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    // Get top words
    const topics = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    return topics;
  }

  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the',
      'and',
      'that',
      'this',
      'with',
      'from',
      'have',
      'been',
      'about',
      'which',
      'where',
      'there',
      'their',
      'would',
      'could',
      'should',
      'because',
      'through',
      'before',
      'after',
      'during',
    ]);

    return commonWords.has(word);
  }

  private detectLanguage(content: string): string {
    // Very simplified language detection
    // In production, use a proper language detection library
    const englishWords = ['the', 'and', 'of', 'to', 'in', 'is', 'that'];
    const words = content.toLowerCase().split(/\s+/).slice(0, 100);

    let englishCount = 0;
    for (const word of words) {
      if (englishWords.includes(word)) {
        englishCount++;
      }
    }

    return englishCount > 5 ? 'en' : 'unknown';
  }
}
