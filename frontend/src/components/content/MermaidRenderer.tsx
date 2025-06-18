'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';
import { useDebounce } from '@/hooks/useDebounce';

interface MermaidRendererProps {
  content: string;
  className?: string;
  isDarkMode?: boolean;
}

// Mermaid type definition
type MermaidAPI = {
  initialize: (config: unknown) => void;
  parse: (content: string, parseOptions?: unknown) => Promise<unknown>;
  render: (id: string, content: string) => Promise<{ svg: string }>;
} & Record<string, unknown>;

// Lazy load mermaid to avoid SSR issues
let mermaidModule: MermaidAPI | null = null;
let mermaidInitialized = false;

const loadMermaid = async () => {
  if (typeof window === 'undefined') return null;
  if (mermaidModule) return mermaidModule;

  try {
    const { default: mermaid } = await import('mermaid');
    mermaidModule = mermaid as unknown as MermaidAPI;
    return mermaid as unknown as MermaidAPI;
  } catch (error) {
    return null;
  }
};

const initializeMermaid = async (isDarkMode: boolean = false) => {
  const mermaid = await loadMermaid();
  if (!mermaid || mermaidInitialized) return mermaid;

  // Based on research, use the appropriate theme and ensure text visibility
  const theme = isDarkMode ? 'dark' : 'default';

  mermaid.initialize({
    startOnLoad: false,
    theme: theme,
    // Only customize if using default theme for better control
    ...(theme === 'default'
      ? {
          themeVariables: {
            // Text colors - CRITICAL for visibility
            primaryTextColor: isDarkMode ? '#f3f4f6' : '#1f2937',
            textColor: isDarkMode ? '#f3f4f6' : '#1f2937',
            labelTextColor: isDarkMode ? '#f3f4f6' : '#1f2937',
            nodeTextColor: isDarkMode ? '#f3f4f6' : '#1f2937',

            // Primary colors
            primaryColor: isDarkMode ? '#374151' : '#e5e7eb',
            primaryBorderColor: isDarkMode ? '#6b7280' : '#9ca3af',

            // Background colors
            background: isDarkMode ? '#1f2937' : '#ffffff',
            mainBkg: isDarkMode ? '#374151' : '#e5e7eb',
            secondBkg: isDarkMode ? '#4b5563' : '#f3f4f6',

            // Line colors
            lineColor: isDarkMode ? '#9ca3af' : '#6b7280',

            // Font settings
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '16px',
          },
        }
      : {}),
    securityLevel: 'loose', // Required for proper rendering
    flowchart: {
      useMaxWidth: true, // Changed back to true for proper scaling
      htmlLabels: true, // Required for text to show
      curve: 'basis',
      nodeSpacing: 50,
      rankSpacing: 50,
      padding: 15,
    },
  });

  mermaidInitialized = true;
  return mermaid;
};

export function MermaidRenderer({
  content,
  className = '',
  isDarkMode = false,
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [mermaid, setMermaid] = useState<MermaidAPI | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce content to avoid excessive re-renders
  const debouncedContent = useDebounce(content?.trim() || '', 300);

  // Generate unique ID without timestamp collisions
  const renderId = useMemo(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `mermaid-${crypto.randomUUID()}`;
    }
    return `mermaid-${Math.random().toString(36).substr(2, 9)}`;
  }, [debouncedContent]);

  // Initialize mermaid on mount and theme change
  useEffect(() => {
    const init = async () => {
      // Reset initialization flag when theme changes
      mermaidInitialized = false;
      const mermaidInstance = await initializeMermaid(isDarkMode);
      setMermaid(mermaidInstance);
    };

    init();
  }, [isDarkMode]);

  useEffect(() => {
    const renderDiagram = async () => {
      // Abort previous render if still in progress
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      if (!containerRef.current || !debouncedContent || !mermaid) {
        return;
      }

      setIsRendering(true);
      setError(null);

      try {
        // Clear previous content
        containerRef.current.innerHTML = '';

        // Clean and validate content
        let cleanContent = debouncedContent
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&#10;/g, '\n')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();

        // Remove any HTML tags
        cleanContent = cleanContent.replace(/<[^>]*>/g, '');

        // Fix common AI-generated issues
        cleanContent = fixMermaidSyntax(cleanContent);

        // If content is severely malformed, show a simple fallback diagram
        if (!cleanContent || cleanContent.length < 10 || !cleanContent.includes('graph')) {
          cleanContent = `graph TD
    A[Error] --> B[Invalid Diagram]
    B --> C[Please Regenerate]`;
        }

        // Validate with mermaid.parse first
        try {
          await mermaid.parse(cleanContent);
        } catch (parseError) {
          const errorMessage =
            parseError instanceof Error ? parseError.message : 'Unknown parsing error';
          throw new Error(`Invalid diagram syntax: ${errorMessage}`);
        }

        // Check if aborted
        if (signal.aborted) return;

        try {
          // Render the diagram
          // Mermaid 11+ doesn't need a container element
          const { svg } = await mermaid.render(renderId, cleanContent);

          // Check if aborted
          if (signal.aborted) {
            // Clean up any DOM elements Mermaid might have created
            const elem = document.getElementById(renderId);
            if (elem) elem.remove();
            return;
          }

          // Sanitize the SVG
          const sanitizedSvg = DOMPurify.sanitize(svg, {
            ADD_TAGS: ['foreignObject', 'switch', 'style'],
            ADD_ATTR: ['xmlns', 'xlink:href', 'transform', 'style', 'class'],
            ALLOW_DATA_ATTR: true,
          });

          // Insert sanitized SVG
          if (containerRef.current && !signal.aborted) {
            containerRef.current.innerHTML = sanitizedSvg;

            // Post-process the SVG for better rendering
            const svgElement = containerRef.current.querySelector('svg');
            if (svgElement) {
              // Ensure responsive sizing
              svgElement.removeAttribute('width');
              svgElement.removeAttribute('height');
              svgElement.style.width = '100%';
              svgElement.style.height = 'auto';
              svgElement.style.maxWidth = '100%';
              svgElement.style.display = 'block';

              // Ensure viewBox is set for proper scaling
              if (!svgElement.getAttribute('viewBox')) {
                // Set a reasonable default viewBox
                svgElement.setAttribute('viewBox', '0 0 1000 600');
              }

              svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            }
          }
        } finally {
          // Clean up any elements Mermaid might have created
          const elem = document.getElementById(renderId);
          if (elem && elem !== containerRef.current) {
            elem.remove();
          }
        }
      } catch (error) {
        if (!signal.aborted) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to render diagram';
          setError(errorMessage);
        }
      } finally {
        if (!signal.aborted) {
          setIsRendering(false);
        }
      }
    };

    renderDiagram();

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedContent, renderId, mermaid]);

  if (error) {
    return (
      <div className="text-red-500 text-sm p-4 border border-red-200 rounded bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <p className="font-semibold">Diagram Rendering Error</p>
        <p className="mt-1">{error}</p>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs">Show diagram content</summary>
            <pre className="mt-2 text-xs overflow-auto bg-black/10 dark:bg-white/10 p-2 rounded">
              {debouncedContent}
            </pre>
          </details>
        )}
      </div>
    );
  }

  if (isRendering) {
    return (
      <div className={`mermaid-loading ${className}`}>
        <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-48 rounded flex items-center justify-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Rendering diagram...</span>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={`mermaid-container ${className}`} />;
}

// Fix common AI-generated Mermaid syntax issues
function fixMermaidSyntax(content: string): string {
  // Split into lines
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line);

  if (lines.length === 0) return content;

  // Check if it's a single-line diagram
  const firstLine = lines[0];
  const isSingleLine = lines.length === 1 && firstLine.includes('-->');

  if (isSingleLine) {
    // Parse single-line diagrams that might contain inline node definitions
    const match = firstLine.match(
      /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|gantt)\s+(\w+)?\s+(.+)$/
    );
    if (match) {
      const [, diagramType, direction, rest] = match;
      const header = direction ? `${diagramType} ${direction}` : diagramType;

      // Capture node definitions like A[Label]
      const nodePattern = /([A-Z]\w*\[[^\]]+\])/g;
      const nodes = rest.match(nodePattern) || [];

      // Capture connections, allowing optional inline definitions on either side
      const connectionPattern =
        /([A-Z]\w*)(?:\[[^\]]+\])?\s*(-->|==>|-.->|--x|---|===)(?:\|([^|]+)\|)?\s*([A-Z]\w*)(?:\[[^\]]+\])?/g;
      const statements: string[] = [];
      let connectionMatch;
      while ((connectionMatch = connectionPattern.exec(rest)) !== null) {
        const [, from, arrow, label, to] = connectionMatch;
        if (label) {
          statements.push(`${from} ${arrow}|${label}| ${to}`);
        } else {
          statements.push(`${from} ${arrow} ${to}`);
        }
      }

      // Deduplicate nodes and connections
      const uniqueNodes = [...new Set(nodes)];
      const uniqueConnections = [...new Set(statements)];
      const allStatements = [...uniqueNodes, ...uniqueConnections];

      return header + '\n' + allStatements.map((s) => '    ' + s).join('\n');
    }
  }

  // For multi-line diagrams, ensure proper formatting
  return lines.join('\n');
}

// Export as dynamic component for Next.js
export default dynamic(() => Promise.resolve(MermaidRenderer), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-48 rounded flex items-center justify-center">
      <span className="text-sm text-gray-500 dark:text-gray-400">Loading diagram...</span>
    </div>
  ),
});
