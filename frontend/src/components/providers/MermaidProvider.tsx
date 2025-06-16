'use client';

// Simple Mermaid provider – initialises diagrams on mount
import { useEffect } from 'react';
import mermaid from 'mermaid';

export default function MermaidProvider() {
  useEffect(() => {
    try {
      mermaid.initialize({ startOnLoad: true, theme: 'base' });
      mermaid.init(undefined, document.querySelectorAll('[data-diagram="mermaid"]'));
    } catch (err) {
      // Ignore SSR / hydration issues silently
      // eslint-disable-next-line no-console
      console.warn('Mermaid init failed', err);
    }
  }, []);

  return null;
} 