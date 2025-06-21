'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/useToast';
import { fileApi } from '@/lib/api/FileApiService';
import { api } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';

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

  // For streaming AI content
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start explanation when file loads
  useEffect(() => {
    console.log('Explain effect triggered:', { fileId, hasContent: !!streamingContent, isStreaming });
    
    if (fileId && !streamingContent && !isStreaming) {
      // Trigger AI explanation
      console.log('Starting AI explanation generation...');
      setIsStreaming(true);
      
      const generateExplanation = async () => {
        try {
          // Get auth token
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session?.access_token) {
            throw new Error('Not authenticated');
          }

          // Force timestamp to bypass any caching
          const timestamp = Date.now();
          const url = `http://localhost:8080/api/v1/learn/explain/stream?t=${timestamp}`;
          console.log('EXPLAIN REQUEST URL:', url);
          console.log('EXPLAIN REQUEST BODY:', JSON.stringify({
            fileId,
            topicId: fileName,
            mode: 'explain'
          }));

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              fileId,
              topicId: fileName,
              mode: 'explain'
            }),
          });

          console.log('Response status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Failed to generate explanation: ${response.status}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let accumulatedContent = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    
                    if (data.type === 'content') {
                      accumulatedContent += data.data;
                      setStreamingContent(accumulatedContent);
                    } else if (data.type === 'complete') {
                      setIsStreaming(false);
                    } else if (data.type === 'error') {
                      setError(data.data?.message || 'Failed to generate explanation');
                      setIsStreaming(false);
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e);
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error('Error generating explanation:', err);
          setError('Failed to generate explanation. Please try again.');
          setIsStreaming(false);
        }
      };

      generateExplanation();
    }
  }, [fileId, fileName]);

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
              <div className="whitespace-pre-wrap">
                {streamingContent ? (
                  <div dangerouslySetInnerHTML={{ __html: streamingContent.replace(/\n/g, '<br />') }} />
                ) : (
                  <p className="text-muted-foreground">Loading content...</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
