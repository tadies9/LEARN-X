/**
 * Configuration interfaces and options for HTML sanitization
 * Defines the structure for sanitization settings and transformations
 */

import { DEFAULT_ALLOWED_TAGS, DEFAULT_ALLOWED_ATTRIBUTES } from './SanitizationRules';

/**
 * Options for HTML sanitization
 */
export interface SanitizeOptions {
  /** List of allowed HTML tags */
  allowedTags?: string[];

  /** Allowed attributes per tag */
  allowedAttributes?: Record<string, string[]>;

  /** Custom tag transformation function */
  transformTag?: (
    tagName: string,
    attributes: Record<string, string>
  ) => { tagName?: string; attributes?: Record<string, string> } | null;

  /** Whether to preserve whitespace */
  preserveWhitespace?: boolean;

  /** Whether to allow Mermaid diagrams */
  allowMermaidDiagrams?: boolean;

  /** Whether to fix formatting issues automatically */
  autoFixFormatting?: boolean;

  /** Maximum allowed nesting depth for HTML elements */
  maxNestingDepth?: number;
}

/**
 * Configuration for Mermaid diagram processing
 */
export interface MermaidConfig {
  /** Whether to process Mermaid diagrams */
  enabled: boolean;

  /** CSS class for Mermaid containers */
  containerClass: string;

  /** CSS class for Mermaid source code */
  sourceClass: string;

  /** Whether to hide source code by default */
  hideSource: boolean;

  /** Maximum diagram size (in characters) */
  maxSize: number;

  /** Allowed diagram types */
  allowedTypes: string[];
}

/**
 * Configuration for content formatting
 */
export interface FormattingConfig {
  /** Whether to add CSS classes to elements */
  addCssClasses: boolean;

  /** CSS classes to add to specific elements */
  cssClasses: Record<string, string>;

  /** Whether to wrap content in article tag */
  wrapInArticle: boolean;

  /** Article CSS class */
  articleClass: string;

  /** Whether to format block elements with line breaks */
  formatBlockElements: boolean;
}

/**
 * Default sanitization configuration
 */
export const DEFAULT_SANITIZE_CONFIG: Required<SanitizeOptions> = {
  allowedTags: DEFAULT_ALLOWED_TAGS,
  allowedAttributes: DEFAULT_ALLOWED_ATTRIBUTES,
  transformTag: undefined as unknown as Required<SanitizeOptions>['transformTag'],
  preserveWhitespace: false,
  allowMermaidDiagrams: true,
  autoFixFormatting: true,
  maxNestingDepth: 10,
};

/**
 * Default Mermaid configuration
 */
export const DEFAULT_MERMAID_CONFIG: MermaidConfig = {
  enabled: true,
  containerClass: 'mermaid-diagram',
  sourceClass: 'mermaid-source',
  hideSource: true,
  maxSize: 5000,
  allowedTypes: [
    'graph',
    'flowchart',
    'sequenceDiagram',
    'classDiagram',
    'stateDiagram',
    'gantt',
    'pie',
    'journey',
  ],
};

/**
 * Default formatting configuration
 */
export const DEFAULT_FORMATTING_CONFIG: FormattingConfig = {
  addCssClasses: true,
  cssClasses: {
    h2: 'ai-content-heading',
    h3: 'ai-content-subheading',
    aside: 'ai-glossary',
    article: 'ai-generated-content',
  },
  wrapInArticle: true,
  articleClass: 'ai-generated-content',
  formatBlockElements: true,
};

/**
 * Complete sanitizer configuration
 */
export interface SanitizerConfig {
  sanitize: Required<SanitizeOptions>;
  mermaid: MermaidConfig;
  formatting: FormattingConfig;
}

/**
 * Default complete configuration
 */
export const DEFAULT_SANITIZER_CONFIG: SanitizerConfig = {
  sanitize: DEFAULT_SANITIZE_CONFIG,
  mermaid: DEFAULT_MERMAID_CONFIG,
  formatting: DEFAULT_FORMATTING_CONFIG,
};

/**
 * Create sanitization configuration with custom options
 */
export function createSanitizeConfig(
  options: Partial<SanitizeOptions> = {}
): Required<SanitizeOptions> {
  return {
    ...DEFAULT_SANITIZE_CONFIG,
    ...options,
    allowedTags: options.allowedTags || DEFAULT_SANITIZE_CONFIG.allowedTags,
    allowedAttributes: options.allowedAttributes || DEFAULT_SANITIZE_CONFIG.allowedAttributes,
  };
}

/**
 * Create Mermaid configuration with custom options
 */
export function createMermaidConfig(options: Partial<MermaidConfig> = {}): MermaidConfig {
  return {
    ...DEFAULT_MERMAID_CONFIG,
    ...options,
  };
}

/**
 * Create formatting configuration with custom options
 */
export function createFormattingConfig(options: Partial<FormattingConfig> = {}): FormattingConfig {
  return {
    ...DEFAULT_FORMATTING_CONFIG,
    ...options,
    cssClasses: {
      ...DEFAULT_FORMATTING_CONFIG.cssClasses,
      ...options.cssClasses,
    },
  };
}

/**
 * Create complete sanitizer configuration with custom options
 */
export function createSanitizerConfig(
  config: {
    sanitize?: Partial<SanitizeOptions>;
    mermaid?: Partial<MermaidConfig>;
    formatting?: Partial<FormattingConfig>;
  } = {}
): SanitizerConfig {
  return {
    sanitize: createSanitizeConfig(config.sanitize),
    mermaid: createMermaidConfig(config.mermaid),
    formatting: createFormattingConfig(config.formatting),
  };
}
