'use client';

import { useState } from 'react';
import { MermaidRenderer } from '@/components/content/MermaidRenderer';
import { useTheme } from 'next-themes';

export function MermaidTest() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [testDiagram] = useState(`graph TD
    A[Start] --> B[Process]
    B --> C[Decision]
    C --> D[End]`);

  return (
    <div className="p-8 space-y-6">
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Mermaid Text Visibility Test</h2>

        <div className="mb-4">
          <strong>Current theme:</strong> {theme || 'loading...'}
        </div>

        <div className="mb-4">
          <strong>Test diagram:</strong>
          <pre className="bg-muted p-2 rounded text-sm mt-2">{testDiagram}</pre>
        </div>

        <div className="border-2 border-dashed border-muted p-4">
          <h3 className="font-medium mb-2">Rendered Diagram:</h3>
          <MermaidRenderer content={testDiagram} isDarkMode={isDarkMode} />
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>✅ Expected: Boxes with visible text labels</p>
          <p>❌ Issue: Empty white boxes with invisible text</p>
        </div>
      </div>
    </div>
  );
}
