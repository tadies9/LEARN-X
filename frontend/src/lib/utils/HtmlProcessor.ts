/**
 * HTML processing and cleaning utilities
 * Handles DOM manipulation, whitespace cleanup, and content transformation
 */

import { BLOCK_ELEMENTS, VALIDATION_PATTERNS, isSelfClosingTag } from './SanitizationRules';
import type { SanitizeOptions } from './SanitizationConfig';

/** HTML processor for cleaning and formatting content */
export class HtmlProcessor {
  constructor(private options: Required<SanitizeOptions>) {}

  /** Fix common formatting issues in AI-generated content */
  fixFormattingIssues(html: string): string {
    if (!this.options.autoFixFormatting) return html;
    html = this.removeDuplicateContent(html);
    html = html.replace(VALIDATION_PATTERNS.malformedTags, '<$1$2 />');
    html = this.fixUnclosedTags(html);
    html = html.replace(VALIDATION_PATTERNS.nestedParagraphs, '<p>$1</p><p>');
    return html.replace(VALIDATION_PATTERNS.unclosedParagraphs, '</p><p>$1</p>');
  }

  /** Remove duplicate content that might appear in streaming */
  private removeDuplicateContent(html: string): string {
    const paragraphs = html.split(/<\/p>\s*<p[^>]*>/);
    const uniqueParagraphs: string[] = [];
    const seen = new Set<string>();
    for (const para of paragraphs) {
      const cleaned = para.replace(/<[^>]+>/g, '').trim();
      if (cleaned && !seen.has(cleaned)) {
        seen.add(cleaned);
        uniqueParagraphs.push(para);
      }
    }
    return uniqueParagraphs.join('</p><p>');
  }

  /** Fix unclosed HTML tags */
  private fixUnclosedTags(html: string): string {
    const stack: string[] = [];
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    let result = html;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const [fullMatch, tagName] = match;
      if (fullMatch.startsWith('</')) {
        const lastIndex = stack.lastIndexOf(tagName.toLowerCase());
        if (lastIndex !== -1) stack.splice(lastIndex, 1);
      } else if (!fullMatch.endsWith('/>') && !isSelfClosingTag(tagName)) {
        stack.push(tagName.toLowerCase());
      }
    }
    while (stack.length > 0) {
      result += `</${stack.pop()}>`;
    }
    return result;
  }

  /** Clean up excessive whitespace */
  cleanWhitespace(html: string): string {
    if (this.options.preserveWhitespace) return html;
    html = html.replace(/\s+/g, ' ').replace(/>\s+</g, '><');
    if (this.options.autoFixFormatting) {
      BLOCK_ELEMENTS.forEach((tag) => {
        html = html.replace(new RegExp(`</${tag}>`, 'gi'), `</${tag}>\n`);
      });
    }
    return html.trim();
  }

  /** Fix image placeholders and convert to proper HTML */
  fixImagePlaceholders(html: string): string {
    html = html.replace(
      /<img\s+src\s*=\s*["']?path\/to\/([^"'\s>]+)["']?([^>]*)>/gi,
      '<figure class="ai-generated-image"><div class="image-placeholder">🖼️ Image: $1</div><figcaption>AI-suggested visual</figcaption></figure>'
    );
    return html.replace(
      /<figure[^>]*>\s*<\s*img[^>]*src\s*=\s*["']?([^"'\s>]+)["']?[^>]*>\s*(<figcaption[^>]*>([^<]+)<\/figcaption>)?\s*<\/figure>/gi,
      (match, src, caption, captionText) => {
        if (src.includes('path/to/') || src.includes('placeholder')) {
          return `<figure class="ai-generated-image"><div class="image-placeholder">🖼️ ${captionText || 'Visual representation'}</div>${caption || ''}</figure>`;
        }
        return match;
      }
    );
  }

  /** Remove dangerous script and style content */
  removeDangerousContent(html: string): string {
    return html
      .replace(VALIDATION_PATTERNS.scriptTag, '')
      .replace(VALIDATION_PATTERNS.styleTag, '')
      .replace(VALIDATION_PATTERNS.eventHandlers, '');
  }

  /** Sanitize URLs in href and src attributes */
  sanitizeUrls(html: string): string {
    return html
      .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
      .replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""')
      .replace(/href\s*=\s*["']vbscript:[^"']*["']/gi, 'href="#"')
      .replace(/src\s*=\s*["']vbscript:[^"']*["']/gi, 'src=""')
      .replace(/href\s*=\s*["']data:text\/html[^"']*["']/gi, 'href="#"')
      .replace(/src\s*=\s*["']data:text\/html[^"']*["']/gi, 'src=""');
  }

  /** Validate nesting depth to prevent deeply nested content */
  validateNestingDepth(html: string): string {
    const maxDepth = this.options.maxNestingDepth;
    if (maxDepth <= 0) return html;
    let depth = 0;
    return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tagName) => {
      if (match.startsWith('</')) {
        depth = Math.max(0, depth - 1);
      } else if (!match.endsWith('/>') && !isSelfClosingTag(tagName)) {
        depth++;
        if (depth > maxDepth) {
          return isSelfClosingTag(tagName) ? match.replace('>', ' />') : '';
        }
      }
      return match;
    });
  }

  /** Process HTML content with all cleaning operations */
  processContent(html: string): string {
    if (!html) return '';
    let processed = this.fixFormattingIssues(html);
    processed = this.removeDangerousContent(processed);
    processed = this.sanitizeUrls(processed);
    processed = this.fixImagePlaceholders(processed);
    processed = this.validateNestingDepth(processed);
    return this.cleanWhitespace(processed);
  }
}
