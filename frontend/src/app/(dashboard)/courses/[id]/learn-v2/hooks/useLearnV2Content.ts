import { useEffect, useState, useRef, useCallback } from 'react';
import { AIApiService } from '@/lib/api/ai';
import { contentCache, CacheOptions } from '@/lib/cache/ContentCache';
import { SSEParser } from '../utils/SSEParser';
import { generateNonStreamingContent } from '../utils/streamUtils';
import { ActiveMode, SessionData, UserProfile, StreamingState } from '../types/streaming';

interface UseLearnV2ContentParams {
  fileId: string | null;
  activeMode: ActiveMode;
  session: SessionData | null;
  fileVersion: string;
  profile: UserProfile | null;
}

export function useLearnV2Content({
  fileId,
  activeMode,
  session,
  fileVersion,
  profile,
}: UseLearnV2ContentParams): StreamingState & {
  regenerate: () => Promise<void>;
} {
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const isLoadingRef = useRef<boolean>(false);
  const sseParserRef = useRef<SSEParser>(new SSEParser());
  const contentAccumulatorRef = useRef<string>('');
  const lastChunkRef = useRef<string>('');

  // Stream content for the file with enhanced error handling and deduplication
  const streamContent = useCallback(async () => {
    if (!session?.access_token || !session?.user?.id || !fileId) return;

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
        fileId: fileId,
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
            fileId: fileId,
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
        try {
          const content = await generateNonStreamingContent(activeMode, fileId);
          setStreamingContent(content);
          setIsStreaming(false);

          // Cache the content
          if (content && session?.user?.id) {
            await contentCache.set(cacheOptions, content);
          }
        } catch (error) {
          setError('Failed to generate content. Please try again.');
          setIsStreaming(false);
        }
      }
    } catch (err) {
      setError('Failed to load content');
      setIsStreaming(false);
    } finally {
      // Always clear loading flag
      isLoadingRef.current = false;
    }
  }, [fileId, activeMode, session, fileVersion, profile?.persona]);

  // Handle regenerate with cache clear
  const regenerate = useCallback(async () => {
    if (!session?.user?.id || !fileId) return;

    // Prevent regeneration if already loading
    if (isLoadingRef.current) {
      return;
    }

    // Clear cache for this specific content
    const cacheOptions: CacheOptions = {
      userId: session.user.id,
      fileId: fileId,
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
  }, [session, fileId, activeMode, fileVersion, profile?.persona, streamContent]);

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
  }, [fileId, session?.access_token, activeMode, fileVersion, profile?.persona, streamContent]);

  return {
    content: streamingContent,
    isStreaming,
    error,
    regenerate,
  };
}
