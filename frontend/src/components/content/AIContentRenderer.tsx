'use client';

import { useEffect, useRef, useReducer } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { formatAIContent, sanitizeHTML } from '@/lib/utils/html-sanitizer';

// Dynamic import MermaidRenderer to avoid SSR issues
const MermaidRenderer = dynamic(() => import('./MermaidRenderer'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-48 rounded" />,
});

interface AIContentRendererProps {
  content: string;
  className?: string;
}

export function AIContentRenderer({ content, className = '' }: AIContentRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramsRef = useRef<{ id: string; content: string }[]>([]);
  const processedRef = useRef<string>('');
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  useEffect(() => {
    if (!containerRef.current) return;

    // Skip if we've already processed this exact content
    if (processedRef.current === content) {
      return;
    }
    processedRef.current = content;

    // If the content already contains HTML-like tags we still want to sanitize it to remove
    // any malformed markup or duplicate chunks coming from the streaming API.
    // Otherwise, convert plain text/markdown to well-formed HTML.
    const hasHtmlTags = /<[^>]+>/.test(content);
    const formattedContent = hasHtmlTags ? sanitizeHTML(content) : formatAIContent(content);

    // First, extract mermaid content before setting innerHTML
    // This prevents the browser from potentially modifying the content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = formattedContent;

    const mermaidElements = tempDiv.querySelectorAll('.mermaid-diagram');
    const newDiagrams: { id: string; content: string }[] = [];

    mermaidElements.forEach((element, index) => {
      // Look for the mermaid content in the child pre element
      const mermaidSourceElement = element.querySelector('.mermaid-source');
      const mermaidContent =
        mermaidSourceElement?.textContent || element.getAttribute('data-mermaid');

      if (mermaidContent && mermaidContent.trim()) {
        const diagramId = `mermaid-${Date.now()}-${index}`;

        // Store the diagram info
        newDiagrams.push({ id: diagramId, content: mermaidContent });

        // Replace the mermaid-diagram div with a placeholder
        element.id = diagramId;
        element.className = 'mermaid-placeholder';
        element.innerHTML = ''; // Clear the content to prevent interference
      }
    });

    // Now set the modified HTML content
    containerRef.current.innerHTML = tempDiv.innerHTML;

    diagramsRef.current = newDiagrams;

    // Force re-render to show portals
    if (newDiagrams.length > 0) {
      forceUpdate();
    }
  }, [content]);

  // Force update hook
  const [, updateState] = useReducer((x) => x + 1, 0);
  const forceUpdate = () => updateState();

  return (
    <>
      <div ref={containerRef} className={className} />
      {/* Render Mermaid diagrams in their placeholders */}
      {diagramsRef.current.map((diagram) => {
        const element = document.getElementById(diagram.id);

        if (!element) {
          return null;
        }

        return createPortal(
          <MermaidRenderer key={diagram.id} content={diagram.content} isDarkMode={isDarkMode} />,
          element
        );
      })}
    </>
  );
}
