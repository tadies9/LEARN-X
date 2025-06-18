/**
 * HTML Sanitizer and Formatter for AI-generated content
 * Refactored for modularity and maintainability
 */

import { HtmlProcessor } from './HtmlProcessor';
import { ContentValidator } from './ContentValidator';
import { looksLikeMermaidDiagram } from './SanitizationRules';
import {
  createSanitizeConfig,
  createMermaidConfig,
  createFormattingConfig,
  type SanitizeOptions,
  type SanitizerConfig,
} from './SanitizationConfig';

export class HTMLSanitizer {
  private config: SanitizerConfig;
  private processor: HtmlProcessor;
  private validator: ContentValidator;

  constructor(options: Partial<SanitizerConfig> = {}) {
    this.config = {
      sanitize: createSanitizeConfig(options.sanitize),
      mermaid: createMermaidConfig(options.mermaid),
      formatting: createFormattingConfig(options.formatting),
    };

    this.processor = new HtmlProcessor(this.config.sanitize);
    this.validator = new ContentValidator(this.config.mermaid);
  }

  /**
   * Sanitize and format HTML content
   */
  sanitize(html: string): string {
    if (!html) return '';

    // Validate content safety
    const safety = this.validator.validateContentSafety(html);
    if (!safety.isValid) {
      console.warn('Content safety issues detected:', safety.issues);
    }

    // Process content through the HTML processor
    return this.processor.processContent(html);
  }

  /**
   * Get current configuration
   */
  getConfig(): SanitizerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SanitizerConfig>): void {
    if (newConfig.sanitize) {
      this.config.sanitize = createSanitizeConfig(newConfig.sanitize);
      this.processor = new HtmlProcessor(this.config.sanitize);
    }
    if (newConfig.mermaid) {
      this.config.mermaid = createMermaidConfig(newConfig.mermaid);
      this.validator = new ContentValidator(this.config.mermaid);
    }
    if (newConfig.formatting) {
      this.config.formatting = createFormattingConfig(newConfig.formatting);
    }
  }

  /**
   * Format AI content with proper structure
   */
  formatAIContent(content: string): string {
    // Check if content looks like plain text with mermaid syntax
    if (!content.includes('<')) {
      // Check if the entire content is a mermaid diagram
      if (looksLikeMermaidDiagram(content)) {
        // Don't wrap mermaid diagrams in paragraph tags
        content = content.trim();
      } else if (content.includes('graph')) {
        // Handle mixed content with potential mermaid
        content = '<p>' + content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
      } else {
        // Regular text content
        content = '<p>' + content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
      }
    }

    // First sanitize
    let formatted = this.sanitize(content);

    // Add CSS classes for styling if enabled
    if (this.config.formatting.addCssClasses) {
      const { cssClasses } = this.config.formatting;
      Object.entries(cssClasses).forEach(([tag, className]) => {
        const regex = new RegExp(`<${tag}>`, 'gi');
        formatted = formatted.replace(regex, `<${tag} class="${className}">`);
      });
    }

    // Extract and fix malformed mermaid content
    formatted = this.validator.extractAndFixMermaidDiagrams(formatted);

    // Process pre-formatted mermaid diagrams
    formatted = this.validator.processMermaidDiagrams(formatted);

    // Wrap in article tag if configured
    if (this.config.formatting.wrapInArticle && !formatted.includes('<article')) {
      formatted = `<article class="${this.config.formatting.articleClass}">${formatted}</article>`;
    }

    return formatted;
  }
}

// Export singleton instance
export const htmlSanitizer = new HTMLSanitizer();

// Export function for direct use
export function sanitizeHTML(html: string): string {
  return htmlSanitizer.sanitize(html);
}

// Export function for formatting AI content
export function formatAIContent(content: string): string {
  return htmlSanitizer.formatAIContent(content);
}

// Export types and configurations for external use
export type { SanitizeOptions, SanitizerConfig } from './SanitizationConfig';
export { createSanitizerConfig } from './SanitizationConfig';
export { looksLikeMermaidDiagram } from './SanitizationRules';
export { HtmlProcessor } from './HtmlProcessor';
export { ContentValidator } from './ContentValidator';
