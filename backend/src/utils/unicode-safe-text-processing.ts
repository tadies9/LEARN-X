/**
 * Unicode-safe text processing utilities
 * Based on LINK-X's approach to handle problematic Unicode characters
 */

/**
 * Clean extracted text to prevent Unicode escape sequence errors
 * Removes problematic control characters while preserving text structure
 */
export function cleanExtractedText(text: string): string {
  if (!text) return '';

  // Remove NUL characters that cause PostgreSQL issues
  text = text.replace(/\x00/g, '');
  
  // Remove other problematic control characters (but preserve \n and \t)
  // This regex removes control characters from \x00-\x08, \x0B, \x0C, \x0E-\x1F, and \x7F
  // but preserves \x09 (tab), \x0A (newline), and \x0D (carriage return)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Handle Unicode escape sequences that might cause JSON parsing issues
  // Replace invalid Unicode escape sequences with empty string
  text = text.replace(/\\u[\dA-Fa-f]{0,3}(?![0-9A-Fa-f])/g, '');
  
  // Normalize line endings
  text = text.replace(/\r\n?/g, '\n');
  
  // Limit consecutive newlines to maximum 2
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Clean up lines while preserving structure
  const lines = text.split('\n');
  const cleanedLines: string[] = [];
  
  for (const line of lines) {
    if (line.trim()) {
      // Normalize internal whitespace (tabs and multiple spaces to single space)
      let cleanedLine = line.replace(/[ \t]+/g, ' ');
      
      // Add spaces between mixed cases for better word boundaries
      // Only split when lowercase followed by uppercase (not acronyms)
      cleanedLine = cleanedLine.replace(/(?<=[a-z])(?=[A-Z][a-z])/g, ' ');
      
      cleanedLines.push(cleanedLine.trim());
    } else {
      // Preserve empty lines for paragraph structure
      cleanedLines.push('');
    }
  }
  
  // Rejoin and clean up
  text = cleanedLines.join('\n');
  
  // Remove leading/trailing whitespace
  return text.trim();
}

/**
 * Sanitize text before storing in database
 * Ensures text is safe for PostgreSQL JSON/JSONB columns
 */
export function sanitizeForDatabase(text: string): string {
  if (!text) return '';
  
  // First apply general cleaning
  text = cleanExtractedText(text);
  
  // Additional sanitization for database storage
  // Escape backslashes that aren't part of valid escape sequences
  text = text.replace(/\\(?![nrtbf"\\\/])/g, '\\\\');
  
  // Remove any remaining control characters that might have been missed
  text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // Ensure valid UTF-8 by removing invalid sequences
  // This is a simplified approach - in production you might want to use a library
  try {
    // Encode and decode to ensure valid UTF-8
    const encoded = new TextEncoder().encode(text);
    text = new TextDecoder('utf-8', { fatal: false }).decode(encoded);
  } catch (e) {
    // If encoding fails, remove non-ASCII characters as fallback
    text = text.replace(/[^\x00-\x7F]/g, '');
  }
  
  return text;
}

/**
 * Clean chunk content before processing
 * Applied to individual chunks before embedding
 */
export function cleanChunkContent(content: string): string {
  if (!content) return '';
  
  // Apply base cleaning
  content = cleanExtractedText(content);
  
  // Additional chunk-specific cleaning
  // Remove references to page numbers, headers, footers
  content = content.replace(/^Page \d+.*$/gm, '');
  content = content.replace(/^\d+\s*$/gm, ''); // Standalone page numbers
  
  // Remove excessive whitespace between words
  content = content.replace(/\s{2,}/g, ' ');
  
  // Ensure chunk isn't just whitespace
  if (!content.trim()) {
    return '';
  }
  
  return content;
}

/**
 * Validate text before processing
 * Returns true if text is safe to process
 */
export function isTextSafe(text: string): boolean {
  if (!text) return false;
  
  // Check for excessive control characters
  const controlCharCount = (text.match(/[\x00-\x1F\x7F-\x9F]/g) || []).length;
  if (controlCharCount > text.length * 0.1) {
    // More than 10% control characters suggests corrupted data
    return false;
  }
  
  // Check for invalid Unicode escape sequences
  const invalidUnicodePattern = /\\u(?![\dA-Fa-f]{4})/;
  if (invalidUnicodePattern.test(text)) {
    return false;
  }
  
  return true;
}

/**
 * Extract safe text from PDF or other sources
 * Wraps the extraction with safety checks
 */
export async function extractSafeText(
  extractFn: () => Promise<string> | string
): Promise<string> {
  try {
    const text = await extractFn();
    
    if (!isTextSafe(text)) {
      throw new Error('Extracted text contains unsafe characters');
    }
    
    return cleanExtractedText(text);
  } catch (error) {
    throw new Error(`Text extraction failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}