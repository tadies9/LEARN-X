'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/useToast';
import { fileApi } from '@/lib/api/file';
import { createClient } from '@/lib/supabase/client';
import { flushSync } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { parseSSEStream } from '@/lib/utils/sse-parser';
import type { SSEExplainMessage } from '@/types/sse.types';

/**
 * Full Takeover Explain Page
 * Clean, focused interface for AI-powered explanations
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
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileLoaded, setFileLoaded] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Use ref to track accumulated content for immediate updates
  const accumulatedContentRef = useRef('');

  // Load file content - only once
  useEffect(() => {
    let cancelled = false;

    const loadFile = async () => {
      if (fileLoaded) return; // Prevent multiple loads

      try {
        const file = await fileApi.getFile(fileId);
        if (!cancelled) {
          console.log('Loaded file:', file);
          setFileContent(`File: ${file.name}\n\nProcessing status: ${file.status}`);
          setFileLoaded(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load file:', error);
          toast({
            title: 'Error loading file',
            description: 'Could not load the file content. Please try again.',
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadFile();

    return () => {
      cancelled = true;
    };
  }, [fileId]); // Remove toast from dependencies

  // Start explanation when file loads
  useEffect(() => {
    console.log('Explain useEffect check:', {
      fileId: !!fileId,
      hasStreamingContent: !!streamingContent,
      isStreaming,
      loading,
      fileLoaded,
    });

    if (fileId && !streamingContent && !isStreaming && !loading && fileLoaded) {
      console.log('Starting explanation generation...');
      // Trigger AI explanation
      setIsStreaming(true);

      const generateExplanation = async () => {
        try {
          // Get auth token
          const supabase = createClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.access_token) {
            throw new Error('Not authenticated');
          }

          const url = '/api/v1/learn/explain/stream';
          console.log('Making explain request to:', url);

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              fileId,
              topicId: fileName,
              mode: 'explain',
            }),
          });

          console.log('Response status:', response.status);

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Failed to generate explanation: ${response.status}`);
          }

          // Reset accumulated content
          accumulatedContentRef.current = '';

          console.log('Starting SSE stream parsing...');
          await parseSSEStream(
            response,
            (data) => {
              console.log('SSE data received:', data);
              console.log(
                'Current accumulated content length:',
                accumulatedContentRef.current.length
              );
              const message = data as unknown as SSEExplainMessage;
              if (message.type === 'content') {
                accumulatedContentRef.current += message.data;
                console.log(
                  'New accumulated content length:',
                  accumulatedContentRef.current.length
                );

                // Use flushSync to force immediate DOM update for streaming effect
                flushSync(() => {
                  setStreamingContent(accumulatedContentRef.current);
                });
              } else if (message.type === 'connected') {
                console.log('SSE connected:', message.data);
              } else if (message.type === 'complete') {
                console.log('SSE complete, final content:', accumulatedContentRef.current);
                setIsStreaming(false);
              } else if (message.type === 'error') {
                console.error('SSE error received:', message);
                setError(message.data?.message || 'Failed to generate explanation');
                setIsStreaming(false);
              }
            },
            (error) => {
              console.error('SSE parsing error:', error);
              setError('Failed to parse streaming response');
              setIsStreaming(false);
            }
          );
        } catch (err) {
          console.error('Error generating explanation:', err);
          setError('Failed to generate explanation. Please try again.');
          setIsStreaming(false);
        }
      };

      generateExplanation();
    }
  }, [fileId, fileName, loading, fileLoaded]); // Remove streamingContent and isStreaming to prevent loops

  // Regenerate content with feedback
  const handleRegenerate = async () => {
    if (!feedback.trim()) {
      toast({
        title: 'Feedback required',
        description: "Please provide feedback on what you'd like to improve.",
        variant: 'destructive',
      });
      return;
    }

    setShowFeedbackDialog(false);
    setIsRegenerating(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const url = '/api/v1/learn/explain/regenerate';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fileId,
          topicId: fileName,
          mode: 'explain',
          feedback: feedback.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to regenerate: ${response.status}`);
      }

      // Clear existing content for fresh regeneration
      setStreamingContent('');
      let accumulatedContent = '';

      await parseSSEStream(
        response,
        (data) => {
          const message = data as unknown as SSEExplainMessage;
          if (message.type === 'content') {
            accumulatedContent += message.data;
            setStreamingContent(accumulatedContent);
          } else if (message.type === 'complete') {
            setIsRegenerating(false);
            toast({
              title: 'Content regenerated',
              description: 'The explanation has been updated based on your feedback.',
            });
          } else if (message.type === 'error') {
            setError(message.data?.message || 'Failed to regenerate');
            setIsRegenerating(false);
          }
        },
        (error) => {
          console.error('SSE parsing error during regeneration:', error);
          setError('Failed to parse streaming response');
          setIsRegenerating(false);
        }
      );
    } catch (err) {
      console.error('Error regenerating:', err);
      setError('Failed to regenerate content. Please try again.');
      setIsRegenerating(false);
      toast({
        title: 'Regeneration failed',
        description: 'Could not regenerate the content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setFeedback(''); // Clear feedback after use
    }
  };

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
          {/* Regenerate button - only show when content is loaded and not streaming */}
          {streamingContent && !isStreaming && !isRegenerating && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFeedbackDialog(true)}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
          )}
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
            {isStreaming || isRegenerating ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">
                  {isRegenerating
                    ? 'Regenerating with your feedback...'
                    : 'Generating explanation...'}
                </span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">
                {streamingContent ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: streamingContent.replace(/\n/g, '<br />') }}
                  />
                ) : (
                  <p className="text-muted-foreground">Loading content...</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Improve this explanation
            </DialogTitle>
            <DialogDescription>
              Tell us what you'd like to see improved or changed in the explanation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="feedback">Your feedback</Label>
              <Textarea
                id="feedback"
                placeholder="e.g., Make it more detailed, add more examples, simplify the language, focus on practical applications..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowFeedbackDialog(false);
                setFeedback('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRegenerate} disabled={!feedback.trim()}>
              Regenerate with feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
