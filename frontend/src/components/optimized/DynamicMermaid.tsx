'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamic import for Mermaid renderer
const MermaidRenderer = dynamic(() => import('@/components/content/MermaidRenderer'), {
  loading: () => <MermaidSkeleton />,
  ssr: false, // Mermaid requires client-side rendering
});

function MermaidSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-64 bg-muted rounded-md flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading diagram...</p>
      </div>
    </div>
  );
}

interface DynamicMermaidProps {
  chart: string;
  className?: string;
}

export function DynamicMermaid({ chart, className }: DynamicMermaidProps) {
  return (
    <Suspense fallback={<MermaidSkeleton />}>
      <MermaidRenderer content={chart} className={className} />
    </Suspense>
  );
}
