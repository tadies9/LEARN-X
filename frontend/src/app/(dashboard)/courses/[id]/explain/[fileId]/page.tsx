'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
// import { StreamingContentDisplay } from '../../learn-v2/components/StreamingContentDisplay';
// import { useLearnV2Content } from '../../learn-v2/hooks/useLearnV2Content';
import { fileApi } from '@/lib/api/file';

/**
 * Full Takeover Explain Page
 * Clean, focused interface for AI-powered explanations
 * Reuses existing learn-v2 streaming logic
 */
export default function ExplainPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const courseId = params.id as string;
  const fileId = params.fileId as string;
  const fileName = searchParams.get('fileName') || 'File';

  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Load file content
  useEffect(() => {
    const loadFile = async () => {
      try {
        const file = await fileApi.getFile(fileId);
        console.log('Loaded file:', file);
        // For now, we'll use the file name as placeholder content
        // In a real implementation, you would fetch the actual content from chunks or a separate endpoint
        setFileContent(`File: ${file.name}\n\nProcessing status: ${file.status}`);
      } catch (error) {
        console.error('Failed to load file:', error);
        toast({
          title: 'Error loading file',
          description: 'Could not load the file content. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    loadFile();
  }, [fileId]);

  // For now, we'll use simple state management
  // In a real implementation, you would integrate with the proper streaming hook
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start explanation when file loads
  useEffect(() => {
    if (fileContent && !streamingContent && !isStreaming) {
      // Trigger initial explanation
      setIsStreaming(true);
      // Simulate streaming content
      setTimeout(() => {
        setStreamingContent(
          'This is a placeholder explanation for the file. In a real implementation, this would stream AI-generated content.'
        );
        setIsStreaming(false);
      }, 1000);
    }
  }, [fileContent]);

  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header */}
      <div className="border-b">
        <div className="container flex items-center gap-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/courses/${courseId}/workspace`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to files
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-medium truncate">{fileName}</h1>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container max-w-4xl mx-auto py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-destructive">{error}</p>
            <Button onClick={() => router.push(`/courses/${courseId}/workspace`)} className="mt-4">
              Return to files
            </Button>
          </div>
        ) : (
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {isStreaming ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">Generating explanation...</span>
              </div>
            ) : (
              <div>
                {streamingContent || <p className="text-muted-foreground">Loading content...</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
