/**
 * Content Chunker Utility
 * Handles intelligent content chunking for streaming
 */
export class ContentChunker {
  /**
   * Chunk content into streamable pieces
   */
  static chunkContent(content: string): string[] {
    const chunks: string[] = [];
    const sentences = content.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > 100) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          chunks.push(sentence);
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * Chunk content by word count
   */
  static chunkByWords(content: string, wordsPerChunk: number = 50): string[] {
    const words = content.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunk = words.slice(i, i + wordsPerChunk).join(' ');
      chunks.push(chunk);
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  /**
   * Chunk content by character count
   */
  static chunkByCharacters(content: string, charactersPerChunk: number = 200): string[] {
    const chunks: string[] = [];

    for (let i = 0; i < content.length; i += charactersPerChunk) {
      chunks.push(content.slice(i, i + charactersPerChunk));
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }
}
