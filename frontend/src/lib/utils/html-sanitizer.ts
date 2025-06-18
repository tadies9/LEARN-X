/**
 * HTML Sanitizer and Formatter for AI-generated content
 */

interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  transformTag?: (
    tagName: string,
    attributes: Record<string, string>
  ) => { tagName?: string; attributes?: Record<string, string> } | null;
}

const DEFAULT_ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'a',
  'img',
  'figure',
  'figcaption',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'blockquote',
  'pre',
  'code',
  'div',
  'span',
  'aside',
  'article',
  'section',
];

const DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height', 'class'],
  figure: ['class'],
  pre: ['class'],
  code: ['class'],
  aside: ['class'],
  div: ['class'],
  span: ['class'],
};

export class HTMLSanitizer {
  private options: SanitizeOptions;

  constructor(options: SanitizeOptions = {}) {
    this.options = {
      allowedTags: options.allowedTags || DEFAULT_ALLOWED_TAGS,
      allowedAttributes: options.allowedAttributes || DEFAULT_ALLOWED_ATTRIBUTES,
      transformTag: options.transformTag,
    };
  }

  /**
   * Sanitize and format HTML content
   */
  sanitize(html: string): string {
    if (!html) return '';

    // First, fix common formatting issues
    let cleaned = this.fixFormattingIssues(html);

    // Remove script tags and their content
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove style tags and their content
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove event handlers
    cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

    // Remove javascript: URLs
    cleaned = cleaned.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');

    // Fix image placeholder issues
    cleaned = this.fixImagePlaceholders(cleaned);

    // Clean up excessive whitespace
    cleaned = this.cleanWhitespace(cleaned);

    return cleaned;
  }

  /**
   * Fix common formatting issues in AI-generated content
   */
  private fixFormattingIssues(html: string): string {
    // Fix merged/duplicate content
    html = this.removeDuplicateContent(html);

    // Fix broken tags
    html = html.replace(/<(\w+)([^>]*?)(?<!\/)>(?![\s\S]*?<\/\1>)/g, '<$1$2 />');

    // Fix unclosed tags
    html = this.fixUnclosedTags(html);

    // Fix nested paragraphs
    html = html.replace(/<p>([^<]*)<p>/g, '<p>$1</p><p>');
    html = html.replace(/<\/p>([^<]*)<\/p>/g, '</p><p>$1</p>');

    return html;
  }

  /**
   * Remove duplicate content that might appear in streaming
   */
  private removeDuplicateContent(html: string): string {
    // Split by paragraph tags to check for duplicates
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

  /**
   * Fix image placeholders and convert to proper HTML
   */
  private fixImagePlaceholders(html: string): string {
    // Fix image tags without proper src
    html = html.replace(
      /<img\s+src\s*=\s*["']?path\/to\/([^"'\s>]+)["']?([^>]*)>/gi,
      '<figure class="ai-generated-image"><div class="image-placeholder">🖼️ Image: $1</div><figcaption>AI-suggested visual</figcaption></figure>'
    );

    // Fix figure tags with missing images
    html = html.replace(
      /<figure[^>]*>\s*<\s*img[^>]*src\s*=\s*["']?([^"'\s>]+)["']?[^>]*>\s*(<figcaption[^>]*>([^<]+)<\/figcaption>)?\s*<\/figure>/gi,
      (match, src, caption, captionText) => {
        if (src.includes('path/to/') || src.includes('placeholder')) {
          return `<figure class="ai-generated-image"><div class="image-placeholder">🖼️ ${captionText || 'Visual representation'}</div>${caption || ''}</figure>`;
        }
        return match;
      }
    );

    return html;
  }

  /**
   * Fix unclosed tags
   */
  private fixUnclosedTags(html: string): string {
    const stack: string[] = [];
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    let result = html;
    let match;

    while ((match = tagRegex.exec(html)) !== null) {
      const [fullMatch, tagName] = match;

      if (fullMatch.startsWith('</')) {
        // Closing tag
        const lastIndex = stack.lastIndexOf(tagName.toLowerCase());
        if (lastIndex !== -1) {
          stack.splice(lastIndex, 1);
        }
      } else if (!fullMatch.endsWith('/>')) {
        // Opening tag (not self-closing)
        const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link'];
        if (!selfClosingTags.includes(tagName.toLowerCase())) {
          stack.push(tagName.toLowerCase());
        }
      }
    }

    // Close any remaining open tags
    while (stack.length > 0) {
      const tag = stack.pop();
      result += `</${tag}>`;
    }

    return result;
  }

  /**
   * Clean up excessive whitespace
   */
  private cleanWhitespace(html: string): string {
    // Remove multiple spaces
    html = html.replace(/\s+/g, ' ');

    // Remove spaces between tags
    html = html.replace(/>\s+</g, '><');

    // Add line breaks after block elements for readability
    const blockElements = [
      'p',
      'div',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'figure',
      'aside',
      'blockquote',
    ];
    blockElements.forEach((tag) => {
      html = html.replace(new RegExp(`</${tag}>`, 'gi'), `</${tag}>\n`);
    });

    return html.trim();
  }

  /**
   * Extract and fix malformed mermaid diagrams mixed with text
   */
  private extractAndFixMermaidDiagrams(html: string): string {
    // Skip if this content already has properly formatted mermaid diagrams
    if (html.includes('class="mermaid-diagram"') && html.includes('class="mermaid-source"')) {
      return html;
    }

    // First check for simple mermaid blocks that are already wrapped in paragraphs
    const simpleMermaidInParagraph =
      /<p[^>]*>\s*((?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)[\s\S]*?)<\/p>/gi;
    let result = html.replace(simpleMermaidInParagraph, (match, diagramContent) => {
      // Check if this looks like a mermaid diagram
      if (this.looksLikeMermaidDiagram(diagramContent)) {
        const cleanDiagram = this.cleanMermaidContent(diagramContent);

        return `<figure>
          <div class="mermaid-diagram">
            <pre class="mermaid-source" style="display:none">${cleanDiagram}</pre>
          </div>
          <figcaption>Diagram</figcaption>
        </figure>`;
      }
      return match;
    });

    // Also check for plain text mermaid at the start of content
    const plainMermaidPattern =
      /^((?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)[\s\S]*?)(?=<|$)/i;
    const plainMatch = result.match(plainMermaidPattern);
    if (plainMatch && this.looksLikeMermaidDiagram(plainMatch[1])) {
      const cleanDiagram = this.cleanMermaidContent(plainMatch[1]);

      result = result.replace(
        plainMermaidPattern,
        `<figure>
        <div class="mermaid-diagram">
          <pre class="mermaid-source" style="display:none">${cleanDiagram}</pre>
        </div>
        <figcaption>Diagram</figcaption>
      </figure>`
      );
    }

    // Original complex pattern matching for malformed content
    const malformedPattern =
      /(?:^|\n|>)([^<]*?)((?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)\s+(?:TD|LR|TB|BT|RL)?[^<]+?)(?=<|$)/gi;

    const foundDiagrams: string[] = [];

    // Extract malformed diagrams
    result = result.replace(malformedPattern, (match, prefix, diagram) => {
      if (this.looksLikeMermaidDiagram(diagram)) {
        const cleanDiagram = this.extractDiagramFromMixedContent(diagram);
        if (cleanDiagram) {
          foundDiagrams.push(cleanDiagram);
          return prefix + '[DIAGRAM_PLACEHOLDER]';
        }
      }
      return match;
    });

    // Also check for diagrams that might be cut off at the end of content
    const cutOffPattern =
      /((?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)\s+(?:TD|LR|TB|BT|RL)?[^<]+)$/i;
    const cutOffMatch = result.match(cutOffPattern);
    if (cutOffMatch && this.looksLikeMermaidDiagram(cutOffMatch[1])) {
      const diagram = cutOffMatch[1];
      const cleanDiagram = this.extractDiagramFromMixedContent(diagram);
      if (cleanDiagram) {
        foundDiagrams.push(cleanDiagram);
        result = result.replace(cutOffPattern, '[DIAGRAM_PLACEHOLDER]');
      }
    }

    // Replace placeholders with proper diagram markup
    foundDiagrams.forEach((diagram) => {
      const replacement = `<figure>
        <div class="mermaid-diagram">
          <pre class="mermaid-source" style="display:none">${diagram}</pre>
        </div>
        <figcaption>Diagram</figcaption>
      </figure>`;

      result = result.replace('[DIAGRAM_PLACEHOLDER]', replacement);
    });

    return result;
  }

  /**
   * Check if content looks like a Mermaid diagram
   */
  private looksLikeMermaidDiagram(content: string): boolean {
    const trimmed = content.trim();

    // Must start with a diagram type
    const startsWithDiagramType =
      /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)\s/i.test(trimmed);
    if (!startsWithDiagramType) return false;

    // Should have nodes or connections
    const hasNodes = /[A-Z]\w*\[[^\]]+\]/.test(trimmed);
    const hasConnections = /(-->|==>|-.->|--x|---|===)/.test(trimmed);
    const hasSequenceSyntax = /(participant|activate|deactivate|note|loop|alt|opt)/.test(trimmed);
    const hasClassSyntax = /(class|<<|>>|\+|-|#)/.test(trimmed);

    return hasNodes || hasConnections || hasSequenceSyntax || hasClassSyntax;
  }

  /**
   * Extract clean diagram from mixed content
   */
  private extractDiagramFromMixedContent(content: string): string | null {
    // Try to extract a valid diagram structure
    const diagramMatch = content.match(
      /((?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)\s+(?:TD|LR|TB|BT|RL)?)/
    );
    if (!diagramMatch) return null;

    const diagramType = diagramMatch[1];
    const nodeMap = new Map<string, string>();
    const connections: string[] = [];

    // First try to extract complete nodes (patterns like A[Label])
    const nodePattern = /([A-Z]\w*)\[([^\]]+)\]/g;
    let nodeMatch;
    while ((nodeMatch = nodePattern.exec(content)) !== null) {
      const [, nodeId, label] = nodeMatch;
      // Clean up the label - remove quotes and limit length
      const cleanLabel = label
        .trim()
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .replace(/["']/g, '') // Remove any internal quotes
        .substring(0, 30); // Limit label length
      nodeMap.set(nodeId, cleanLabel);
    }

    // Also check for incomplete nodes (e.g., "D[Investment" without closing ])
    // This regex looks for pattern like "D[Dividend" at the end of string or before quote/tag
    const incompleteNodePattern = /([A-Z]\w*)\[([^<\]\n]+?)(?:["']?\s*$|["']?\s*<|["']?\s*\n)/g;
    let incompleteMatch;
    while ((incompleteMatch = incompleteNodePattern.exec(content)) !== null) {
      const [, nodeId, partialLabel] = incompleteMatch;
      if (!nodeMap.has(nodeId)) {
        // Clean up the partial label
        const cleanLabel = partialLabel
          .trim()
          .replace(/^["']|["']$/g, '')
          .replace(/["']/g, '')
          .substring(0, 30);
        nodeMap.set(nodeId, cleanLabel || nodeId); // Use nodeId as fallback label
      }
    }

    // Extract connections
    const connectionPattern = /([A-Z]\w*)\s*(-->|==>|-.->|--x|---)\s*([A-Z]\w*)/g;
    let connMatch;
    const connectedNodes = new Set<string>();
    while ((connMatch = connectionPattern.exec(content)) !== null) {
      const [, from, arrow, to] = connMatch;
      connections.push(`${from} ${arrow} ${to}`);
      connectedNodes.add(from);
      connectedNodes.add(to);
    }

    // Ensure all connected nodes have labels
    connectedNodes.forEach((nodeId) => {
      if (!nodeMap.has(nodeId)) {
        nodeMap.set(nodeId, nodeId); // Use ID as label if not found
      }
    });

    if (nodeMap.size === 0 || connections.length === 0) {
      return null;
    }

    // Build clean diagram
    const nodeDefinitions = Array.from(nodeMap.entries()).map(
      ([id, label]) => `    ${id}[${label}]`
    );

    const cleanDiagram = [
      diagramType,
      ...nodeDefinitions,
      ...connections.map((c) => `    ${c}`),
    ].join('\n');

    return cleanDiagram;
  }

  /**
   * Clean mermaid content
   */
  private cleanMermaidContent(content: string): string {
    // Remove any HTML entities
    let cleaned = content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Remove any HTML tags that might have leaked in
    cleaned = cleaned.replace(/<[^>]+>/g, '');

    // Fix common malformed patterns where HTML gets mixed with Mermaid
    // Remove table-related remnants
    cleaned = cleaned.replace(/\s*table>\s*/g, ' ');
    cleaned = cleaned.replace(/\s*thead>\s*/g, ' ');
    cleaned = cleaned.replace(/\s*tbody>\s*/g, ' ');
    cleaned = cleaned.replace(/\s*<\s*/g, ' ');
    cleaned = cleaned.replace(/\s*>\s*/g, ' ');

    // Clean up node labels that might have HTML remnants
    cleaned = cleaned.replace(/\[([^\]]*?)(?:<[^>]*>)+([^\]]*?)\]/g, '[$1$2]');

    // Ensure proper line breaks and clean up extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/(\w+)\s+(-->|==>|-.->|--x|---)\s+(\w+)/g, '\n    $1 $2 $3');
    cleaned = cleaned.replace(
      /(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)\s+(TD|LR|TB|BT|RL)?/i,
      '$1 $2\n'
    );

    // Clean up node definitions
    cleaned = cleaned.replace(/(\w+)\s*\[([^\]]+)\]/g, '\n    $1[$2]');

    // Ensure proper formatting
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Format AI content with proper structure
   */
  formatAIContent(content: string): string {
    // Check if content looks like plain text with mermaid syntax
    if (!content.includes('<')) {
      // Check if the entire content is a mermaid diagram
      if (this.looksLikeMermaidDiagram(content)) {
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

    // Add CSS classes for styling
    formatted = formatted.replace(/<h2>/gi, '<h2 class="ai-content-heading">');
    formatted = formatted.replace(/<h3>/gi, '<h3 class="ai-content-subheading">');
    formatted = formatted.replace(/<aside\s+class="glossary">/gi, '<aside class="ai-glossary">');

    // First, try to extract any malformed mermaid content mixed with text
    formatted = this.extractAndFixMermaidDiagrams(formatted);

    // Handle properly formatted mermaid diagrams
    formatted = formatted.replace(
      /<pre\s+class="mermaid">([\s\S]*?)<\/pre>/gi,
      (match, content) => {
        // Clean the content before passing to renderer
        const cleanedContent = this.cleanMermaidContent(content);
        const escapedContent = cleanedContent.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        return `<div class="mermaid-diagram" data-mermaid="${escapedContent}"></div>`;
      }
    );

    // Wrap in article tag if not already
    if (!formatted.includes('<article')) {
      formatted = `<article class="ai-generated-content">${formatted}</article>`;
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
