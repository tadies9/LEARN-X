'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Dynamic import with loading state
const PdfViewer = dynamic(
  () => import('@/components/learning/PdfViewer').then((mod) => ({ default: mod.PDFViewer })),
  {
    loading: () => <PdfViewerSkeleton />,
    ssr: false, // Disable SSR for PDF viewer
  }
);

// Loading skeleton that matches the PDF viewer dimensions
function PdfViewerSkeleton() {
  return (
    <div className="flex items-center justify-center h-[600px] bg-muted rounded-lg">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading PDF viewer...</p>
      </div>
    </div>
  );
}

interface DynamicPdfViewerProps {
  url: string;
  className?: string;
}

export function DynamicPdfViewer({ url, className }: DynamicPdfViewerProps) {
  return (
    <Suspense fallback={<PdfViewerSkeleton />}>
      <div className={className}>
        <PdfViewer url={url} />
      </div>
    </Suspense>
  );
}
