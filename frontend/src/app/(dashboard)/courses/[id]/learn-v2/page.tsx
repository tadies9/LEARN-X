'use client';

import '@/styles/ai-content.css';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  BookOpen,
  MessageSquare,
  Brain,
  HelpCircle,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Meh,
  RefreshCw,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { AIApiService } from '@/lib/api/ai';
import { createClient } from '@/lib/supabase/client';
import { contentCache, CacheOptions } from '@/lib/cache/ContentCache';
import { SavedContentApiService } from '@/lib/api/saved';
import { StreamingDebug } from '@/components/debug/StreamingDebug';
import { AIContentRenderer } from '@/components/content/AIContentRenderer';
import React from 'react';

// SSE Event Types
interface SSEEvent {
  type: string;
  data: unknown;
}

interface ContentEvent extends SSEEvent {
  type: 'content';
  data: string;
}

interface CompleteEvent extends SSEEvent {
  type: 'complete' | 'done';
  data: null;
}

interface ErrorEvent extends SSEEvent {
  type: 'error';
  data: {
    message?: string;
  } | null;
}

type StreamEvent = ContentEvent | CompleteEvent | ErrorEvent;

// SSE Parser to handle different event formats
class SSEParser {
  private buffer = '';

  parseChunk(chunk: string): Array<StreamEvent> {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    const events: Array<StreamEvent> = [];

    // Keep the last line if it's incomplete
    this.buffer = lines[lines.length - 1];

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();

      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();

        if (data === '[DONE]') {
          events.push({ type: 'done', data: null });
          continue;
        }

        if (data === '') continue;

        try {
          const parsed = JSON.parse(data);
          events.push(parsed);
        } catch {
          // Handle non-JSON data as raw content
          if (data && !data.startsWith('{')) {
            events.push({ type: 'content', data });
          }
        }
      }
    }

    return events;
  }

  reset() {
    this.buffer = '';
  }
}

export default function LearnPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');
  const fileName = searchParams.get('fileName');
  const _courseId = params.id;

  // Auth & Profile
  const { user: _user } = useAuth();
  const [session, setSession] = useState<{ access_token: string; user: { id: string } } | null>(
    null
  );
  const [profile, setProfile] = useState<{ persona?: Record<string, unknown> } | null>(null);
  const [fileVersion, setFileVersion] = useState<string>('');

  // UI State
  const [activeMode, setActiveMode] = useState<
    'explain' | 'summary' | 'flashcards' | 'quiz' | 'chat'
  >('explain');

  // Content State
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [reaction, setReaction] = useState<'positive' | 'neutral' | 'negative' | null>(null);

  // Loading & Error State
  const [error, setError] = useState<string | null>(null);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const isLoadingRef = useRef<boolean>(false);
  const sseParserRef = useRef<SSEParser>(new SSEParser());
  const contentAccumulatorRef = useRef<string>('');
  const lastChunkRef = useRef<string>('');

  // Get session and file version
  useEffect(() => {
    const getSession = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);

      // Load user profile for persona via backend API
      if (session?.user?.id) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/persona`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const profileData = await response.json();
            setProfile(profileData);
          }
        } catch (error) {
          // Silently handle error - profile might not exist yet
        }
      }
    };
    getSession();
  }, []);

  // Get file version for cache invalidation via backend API
  useEffect(() => {
    const getFileVersion = async () => {
      if (!fileId || !session?.access_token) return;

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/${fileId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const fileData = await response.json();
          setFileVersion(fileData.updatedAt || fileData.updated_at);
        }
      } catch (error) {
        // Silently handle error - file might not exist
      }
    };
    getFileVersion();
  }, [fileId, session]);

  // Initialize content streaming on mount or when dependencies change
  useEffect(() => {
    if (!fileId) {
      setError('File ID is required. Please select a file to personalize.');
      return;
    }

    if (!session?.access_token) {
      return;
    }

    // Reset state when mode changes
    setStreamingContent('');
    contentAccumulatorRef.current = '';
    lastChunkRef.current = '';
    sseParserRef.current.reset();

    streamContent();

    return () => {
      // Cleanup on unmount or dependency change
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      isLoadingRef.current = false;
    };
  }, [fileId, session?.access_token, activeMode, fileVersion, profile?.persona]);

  // Stream content for the file with enhanced error handling and deduplication
  const streamContent = useCallback(async () => {
    if (!session?.access_token || !session?.user?.id) return;

    // Prevent multiple simultaneous streams
    if (isLoadingRef.current) {
      return;
    }

    try {
      // Set loading flag
      isLoadingRef.current = true;

      // Check cache first
      const cacheOptions: CacheOptions = {
        userId: session.user.id,
        fileId: fileId || '',
        topicId: 'default',
        subtopic: 'intro',
        mode: activeMode,
        version: fileVersion,
        persona: profile?.persona,
      };

      const cachedContent = await contentCache.get(cacheOptions);

      if (cachedContent) {
        // Use cached content - set it immediately without streaming
        setStreamingContent(cachedContent);
        setIsStreaming(false);
        isLoadingRef.current = false;
        return;
      }

      setIsStreaming(true);
      setStreamingContent('');
      contentAccumulatorRef.current = '';
      lastChunkRef.current = '';
      setError(null);

      // Cancel any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      abortControllerRef.current = new AbortController();

      // Handle different content modes
      if (activeMode === 'explain') {
        // Use explanation streaming with enhanced error handling
        try {
          const response = await AIApiService.streamExplanation({
            fileId: fileId || undefined,
            topicId: 'default',
            subtopic: 'intro',
            mode: activeMode,
            token: session.access_token,
          });

          if (!response.body) {
            throw new Error('No response body');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          try {
            let done = false;
            while (!done) {
              // Check if request was aborted
              if (abortControllerRef.current?.signal.aborted) {
                break;
              }

              const { done: isDone, value } = await reader.read();

              if (isDone) {
                done = true;
                setIsStreaming(false);
                break;
              }

              const chunk = decoder.decode(value, { stream: true });
              const events = sseParserRef.current.parseChunk(chunk);

              for (const event of events) {
                if (event.type === 'content' && event.data) {
                  // Deduplicate content by checking if this chunk was already added
                  if (event.data !== lastChunkRef.current) {
                    contentAccumulatorRef.current += event.data;
                    lastChunkRef.current = event.data;
                    setStreamingContent(contentAccumulatorRef.current);
                  }
                } else if (event.type === 'complete' || event.type === 'done') {
                  setIsStreaming(false);
                  break;
                } else if (event.type === 'error') {
                  setError(event.data?.message || 'Streaming error occurred');
                  setIsStreaming(false);
                  break;
                }
              }
            }
          } finally {
            reader.releaseLock();
          }

          // Cache the content after successful streaming
          if (
            contentAccumulatorRef.current &&
            session?.user?.id &&
            !abortControllerRef.current?.signal.aborted
          ) {
            await contentCache.set(cacheOptions, contentAccumulatorRef.current);
          }
        } catch (streamError) {
          // Don't show error if request was aborted
          if (!abortControllerRef.current?.signal.aborted) {
            setError('Failed to load explanation. Please try again.');
          }
          setIsStreaming(false);
        }
      } else {
        // Handle other modes (summary, flashcards, quiz) with direct API calls
        await handleNonStreamingContent();
      }
    } catch (err) {
      setError('Failed to load content');
      setIsStreaming(false);
    } finally {
      // Always clear loading flag
      isLoadingRef.current = false;
    }
  }, [fileId, activeMode, session, fileVersion, profile?.persona]);

  // Handle non-streaming content modes
  const handleNonStreamingContent = async () => {
    try {
      switch (activeMode) {
        case 'summary': {
          const summaryResult = await AIApiService.generateSummary(fileId!, 'key-points');
          const summaryHtml = `
            <div class="ai-generated-content">
              <h2>Summary</h2>
              <p>${summaryResult.summary}</p>
            </div>
          `;
          setStreamingContent(summaryHtml);
          break;
        }

        case 'flashcards': {
          const flashcardsResult = await AIApiService.generateFlashcards(fileId!, []);
          const flashcardsHtml = `
            <div class="ai-generated-content">
              <h2>Flashcards</h2>
              ${flashcardsResult.flashcards
                .map(
                  (card, index) => `
                <div class="flashcard mb-4 p-4 border rounded-lg">
                  <div class="flashcard-front mb-2">
                    <h3>Question ${index + 1}</h3>
                    <p>${card.front}</p>
                  </div>
                  <div class="flashcard-back mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <strong>Answer:</strong>
                    <p>${card.back}</p>
                  </div>
                  <div class="flashcard-difficulty text-sm text-gray-600 mt-2">
                    Difficulty: ${card.difficulty}
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          `;
          setStreamingContent(flashcardsHtml);
          break;
        }

        case 'quiz': {
          const quizResult = await AIApiService.generateQuiz(fileId!, 'multiple_choice', []);
          const quizHtml = quizResult.questions
            .map(
              (q, index) => `
            <div class="quiz-question mb-6 p-4 border rounded-lg">
              <div class="question mb-3">
                <strong>Question ${index + 1}:</strong> ${q.question}
              </div>
              ${
                q.options
                  ? `
                <div class="options mb-3">
                  ${q.options.map((opt, i) => `<div>${String.fromCharCode(65 + i)}) ${opt}</div>`).join('')}
                </div>
              `
                  : ''
              }
              <div class="answer mb-2">
                <strong>Answer:</strong> ${q.answer}
              </div>
              <div class="explanation text-sm text-gray-600">
                <strong>Explanation:</strong> ${q.explanation}
              </div>
            </div>
          `
            )
            .join('');
          setStreamingContent(
            `<div class="quiz"><h3>Quiz (${quizResult.count} questions)</h3>${quizHtml}</div>`
          );
          break;
        }

        default:
          setStreamingContent('<p>Select a mode to generate content.</p>');
      }

      setIsStreaming(false);
    } catch (error) {
      setError('Failed to generate content. Please try again.');
      setIsStreaming(false);
    }
  };

  // Handle reaction
  const handleReaction = async (reactionType: 'positive' | 'neutral' | 'negative') => {
    setReaction(reactionType);

    // Send feedback to backend using new API
    try {
      await AIApiService.submitFeedback({
        contentId: `default-intro`,
        helpful: reactionType === 'positive',
        rating: reactionType === 'positive' ? 5 : reactionType === 'neutral' ? 3 : 1,
        comments: quickNote || undefined,
      });
    } catch (err) {
      // Error already handled in specific catch blocks
    }
  };

  // Handle save content
  const handleSaveContent = async () => {
    if (!streamingContent || !session?.user?.id || !fileId) return;

    try {
      await SavedContentApiService.save({
        fileId,
        topicId: 'default',
        subtopic: 'intro',
        content: streamingContent,
        mode: activeMode,
        tags: [],
        notes: quickNote || undefined,
      });

      alert('Content saved successfully! You can access it from your saved content library.');
    } catch (err) {
      alert('Failed to save content. Please try again.');
    }
  };

  // Handle regenerate with cache clear
  const handleRegenerate = async () => {
    if (!session?.user?.id) return;

    // Prevent regeneration if already loading
    if (isLoadingRef.current) {
      return;
    }

    // Clear cache for this specific content
    const cacheOptions: CacheOptions = {
      userId: session.user.id,
      fileId: fileId || '',
      topicId: 'default',
      subtopic: 'intro',
      mode: activeMode,
      version: fileVersion,
      persona: profile?.persona,
    };

    // Clear from cache
    await contentCache.clear(cacheOptions);

    // Reset parser and accumulators
    sseParserRef.current.reset();
    contentAccumulatorRef.current = '';
    lastChunkRef.current = '';

    // Regenerate content
    await streamContent();
  };

  // Render error state
  if (error && !streamingContent) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <div className="text-destructive mb-4">
            <HelpCircle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Unable to Load Content</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Main Content Column (100%) */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{fileName || 'Learning Session'}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>AI-Powered Learning</span>
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-2">
            <Tabs
              value={activeMode}
              onValueChange={(v) =>
                setActiveMode(v as 'explain' | 'summary' | 'flashcards' | 'quiz' | 'chat')
              }
            >
              <TabsList>
                <TabsTrigger value="explain" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Explain
                </TabsTrigger>
                <TabsTrigger value="summary" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Summary
                </TabsTrigger>
                <TabsTrigger value="flashcards" className="gap-2">
                  <Brain className="h-4 w-4" />
                  Flashcards
                </TabsTrigger>
                <TabsTrigger value="quiz" className="gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Quiz
                </TabsTrigger>
                <TabsTrigger value="chat" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-4">
              <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={isStreaming}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveContent}
                disabled={!streamingContent}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </div>

        {/* Streaming Content */}
        <div className="flex-1 overflow-auto p-6 bg-background/60">
          {isStreaming && !streamingContent && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">Generating personalized content…</p>
            </div>
          )}
          {error && <p className="text-sm text-destructive mb-4">{error}</p>}
          {streamingContent && (
            <>
              <AIContentRenderer
                content={streamingContent}
                className="prose lg:prose-lg dark:prose-invert max-w-screen-lg mx-auto ai-generated-content"
              />

              {/* Feedback Section */}
              <div className="max-w-screen-lg mx-auto mt-8 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">Was this helpful?</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={reaction === 'positive' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleReaction('positive')}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={reaction === 'neutral' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleReaction('neutral')}
                      >
                        <Meh className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={reaction === 'negative' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleReaction('negative')}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Quick Note */}
                <div className="mt-4">
                  <textarea
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    placeholder="Add a quick note or feedback..."
                    className="w-full p-3 border rounded-lg text-sm resize-none"
                    rows={2}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Debug Component */}
      <StreamingDebug
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        error={error}
        activeMode={activeMode}
        fileId={fileId}
      />
    </div>
  );
}
