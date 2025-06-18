/**
 * Sanitization rules and validation for HTML content
 * Defines allowed tags, attributes, and validation patterns
 */

/** Default allowed HTML tags for AI-generated content */
export const DEFAULT_ALLOWED_TAGS = [
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

/** Default allowed attributes per tag */
export const DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height', 'class'],
  figure: ['class'],
  pre: ['class'],
  code: ['class'],
  aside: ['class'],
  div: ['class'],
  span: ['class'],
};

/** Self-closing HTML tags that don't need closing tags */
export const SELF_CLOSING_TAGS = [
  'img',
  'br',
  'hr',
  'input',
  'meta',
  'link',
  'area',
  'base',
  'col',
  'embed',
  'keygen',
  'param',
  'source',
  'track',
  'wbr',
];

/** Block-level elements that should have line breaks after them */
export const BLOCK_ELEMENTS = [
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
  'article',
  'section',
  'header',
  'footer',
  'main',
  'nav',
];

/** Dangerous attributes that should be removed */
export const DANGEROUS_ATTRIBUTES = [
  'onload',
  'onerror',
  'onclick',
  'onmouseover',
  'onfocus',
  'onblur',
  'onchange',
  'onsubmit',
  'onreset',
  'onselect',
  'onkeydown',
  'onkeyup',
  'onkeypress',
];

/** Patterns for dangerous URLs that should be sanitized */
export const DANGEROUS_URL_PATTERNS = [
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /data:application\/x-/gi,
];

/** Mermaid diagram type patterns */
export const MERMAID_DIAGRAM_TYPES = [
  'graph',
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'gantt',
  'pie',
  'journey',
  'gitgraph',
];

/** Patterns to identify Mermaid diagram syntax */
export const MERMAID_SYNTAX_PATTERNS = {
  diagramTypes: new RegExp(`^(${MERMAID_DIAGRAM_TYPES.join('|')})\\s`, 'i'),
  nodes: /[A-Z]\w*\[[^\]]+\]/,
  connections: /(-->|==>|-.->|--x|---|===)/,
  sequenceSyntax: /(participant|activate|deactivate|note|loop|alt|opt)/,
  classSyntax: /(class|<<|>>|\+|-|#)/,
  directions: /\b(TD|LR|TB|BT|RL)\b/,
};

/** Validation patterns for content safety */
export const VALIDATION_PATTERNS = {
  scriptTag: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  styleTag: /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  eventHandlers: /\s*on\w+\s*=\s*["'][^"']*["']/gi,
  malformedTags: /<(\w+)([^>]*?)(?<!\/)>(?![\s\S]*?<\/\1>)/g,
  nestedParagraphs: /<p>([^<]*)<p>/g,
  unclosedParagraphs: /<\/p>([^<]*)<\/p>/g,
};

// Utility functions
export const isSelfClosingTag = (tagName: string): boolean =>
  SELF_CLOSING_TAGS.includes(tagName.toLowerCase());

export const isBlockElement = (tagName: string): boolean =>
  BLOCK_ELEMENTS.includes(tagName.toLowerCase());

export const isDangerousAttribute = (attributeName: string): boolean =>
  DANGEROUS_ATTRIBUTES.some((dangerous) =>
    attributeName.toLowerCase().includes(dangerous.toLowerCase())
  );

export const isDangerousUrl = (url: string): boolean =>
  DANGEROUS_URL_PATTERNS.some((pattern) => pattern.test(url));

export const startsWithMermaidDiagramType = (content: string): boolean =>
  MERMAID_SYNTAX_PATTERNS.diagramTypes.test(content.trim());

export const containsMermaidSyntax = (content: string): boolean => {
  const { nodes, connections, sequenceSyntax, classSyntax } = MERMAID_SYNTAX_PATTERNS;
  return (
    nodes.test(content) ||
    connections.test(content) ||
    sequenceSyntax.test(content) ||
    classSyntax.test(content)
  );
};

export const looksLikeMermaidDiagram = (content: string): boolean => {
  const trimmed = content.trim();
  return startsWithMermaidDiagramType(trimmed) && containsMermaidSyntax(trimmed);
};
