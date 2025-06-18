/**
 * File type handlers for different document formats
 * This module provides extensible handlers for various file types
 */

export interface FileTypeHandler {
  supportedExtensions: string[];
  parse(content: string, fileName?: string): string;
  validate(fileName: string): boolean;
}

export class TextFileHandler implements FileTypeHandler {
  supportedExtensions = ['.txt', '.md', '.markdown'];

  parse(content: string, _fileName?: string): string {
    return content;
  }

  validate(fileName: string): boolean {
    const ext = fileName.toLowerCase().split('.').pop();
    return this.supportedExtensions.some((supported) => supported.includes(ext || ''));
  }
}

export class MarkdownFileHandler implements FileTypeHandler {
  supportedExtensions = ['.md', '.markdown', '.mdown', '.mkdn'];

  parse(content: string, _fileName?: string): string {
    // Basic markdown parsing - can be extended with markdown parser
    return content;
  }

  validate(fileName: string): boolean {
    const ext = fileName.toLowerCase().split('.').pop();
    return this.supportedExtensions.some((supported) => supported.includes(ext || ''));
  }
}

export class PDFFileHandler implements FileTypeHandler {
  supportedExtensions = ['.pdf'];

  parse(content: string, _fileName?: string): string {
    // PDF parsing would require additional libraries like pdf-parse
    // For now, assume content is already extracted text
    return content;
  }

  validate(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.pdf');
  }
}

export class DOCXFileHandler implements FileTypeHandler {
  supportedExtensions = ['.docx', '.doc'];

  parse(content: string, _fileName?: string): string {
    // DOCX parsing would require additional libraries like mammoth
    // For now, assume content is already extracted text
    return content;
  }

  validate(fileName: string): boolean {
    const lower = fileName.toLowerCase();
    return lower.endsWith('.docx') || lower.endsWith('.doc');
  }
}

export class FileTypeManager {
  private handlers: Map<string, FileTypeHandler> = new Map();

  constructor() {
    this.registerHandler('text', new TextFileHandler());
    this.registerHandler('markdown', new MarkdownFileHandler());
    this.registerHandler('pdf', new PDFFileHandler());
    this.registerHandler('docx', new DOCXFileHandler());
  }

  registerHandler(name: string, handler: FileTypeHandler): void {
    this.handlers.set(name, handler);
  }

  getHandler(fileName: string): FileTypeHandler | null {
    for (const handler of this.handlers.values()) {
      if (handler.validate(fileName)) {
        return handler;
      }
    }
    return null;
  }

  getSupportedExtensions(): string[] {
    const extensions: string[] = [];
    for (const handler of this.handlers.values()) {
      extensions.push(...handler.supportedExtensions);
    }
    return [...new Set(extensions)];
  }

  parseFile(content: string, fileName?: string): string {
    if (!fileName) {
      return content;
    }

    const handler = this.getHandler(fileName);
    if (handler) {
      return handler.parse(content, fileName);
    }

    // Default to treating as plain text
    return content;
  }
}
