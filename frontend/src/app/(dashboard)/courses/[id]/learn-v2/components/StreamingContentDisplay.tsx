import React from 'react';
import { AIContentRenderer } from '@/components/content/AIContentRenderer';

interface StreamingContentDisplayProps {
  content: string;
  isStreaming: boolean;
  error: string | null;
}

export function StreamingContentDisplay({
  content,
  isStreaming,
  error,
}: StreamingContentDisplayProps) {
  if (isStreaming && !content) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-sm text-muted-foreground">Generating personalized content…</p>
      </div>
    );
  }

  return (
    <>
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}
      {content && (
        <AIContentRenderer
          content={content}
          className="prose lg:prose-lg dark:prose-invert max-w-screen-lg mx-auto ai-generated-content"
        />
      )}
    </>
  );
}
