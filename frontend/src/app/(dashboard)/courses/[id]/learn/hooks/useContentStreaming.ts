import { useState, useRef, useCallback } from 'react';
import { AIApiService } from '@/lib/api/ai';
import { contentCache, CacheOptions } from '@/lib/cache/ContentCache';
import { StudyMode, Topic, UserProfile } from '../types/study';

interface UseContentStreamingOptions {
  fileId: string | null;
  selectedTopic: string | null;
  selectedSubtopic: string | null;
  activeMode: StudyMode;
  session: any;
  fileVersion: string;
  profile: UserProfile | null;
  outline: Topic[];
}

export function useContentStreaming({
  fileId,
  selectedTopic,
  selectedSubtopic,
  activeMode,
  session,
  fileVersion,
  profile,
  outline,
}: UseContentStreamingOptions) {
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const streamContent = useCallback(async () => {
    if (!selectedTopic || !selectedSubtopic || !session?.access_token || !session?.user?.id) return;

    try {
      // Check cache first
      const cacheOptions: CacheOptions = {
        userId: session.user.id,
        fileId: fileId || '',
        topicId: selectedTopic,
        subtopic: selectedSubtopic,
        mode: activeMode,
        version: fileVersion,
        persona: profile?.persona,
      };

      const cachedContent = await contentCache.get(cacheOptions);

      if (cachedContent) {
        setStreamingContent(cachedContent);
        setIsStreaming(false);
        return;
      }

      setIsStreaming(true);
      setStreamingContent('');
      setError(null);

      // Cancel any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Handle different content modes
      if (activeMode === 'explain') {
        await streamExplanationContent(cacheOptions, abortController);
      } else {
        await handleNonStreamingContent();
      }
    } catch (err) {
      console.error('[useContentStreaming] Error streaming content:', err);
      setError('Failed to load content');
      setIsStreaming(false);
    }
  }, [
    selectedTopic,
    selectedSubtopic,
    fileId,
    activeMode,
    session,
    fileVersion,
    profile?.persona,
    outline,
  ]);

  const streamExplanationContent = async (
    cacheOptions: CacheOptions,
    abortController: AbortController
  ) => {
    try {
      const response = await AIApiService.streamExplanation({
        fileId: fileId || undefined,
        topicId: selectedTopic!,
        subtopic: selectedSubtopic!,
        mode: activeMode,
        token: session.access_token,
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (abortController.signal.aborted) {
          reader.cancel();
          break;
        }

        const { done, value } = await reader.read();

        if (done) {
          setIsStreaming(false);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              setIsStreaming(false);
              break;
            }

            try {
              const parsed = JSON.parse(data);
              // Handle proper SSE format: {type: 'content', data: 'text'}
              if (parsed.type === 'content' && parsed.data) {
                fullContent += parsed.data;
                setStreamingContent(fullContent);
              }
              // Handle completion
              else if (parsed.type === 'complete') {
                setIsStreaming(false);
                break;
              }
              // Handle errors
              else if (parsed.type === 'error') {
                setError(parsed.data?.message || 'Streaming error occurred');
                setIsStreaming(false);
                break;
              }
              // Fallback for old format
              else if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
            } catch (parseError) {
              console.warn('[useContentStreaming] Failed to parse SSE data:', data);
            }
          }
        }
      }

      // Cache the content after successful streaming
      if (fullContent && session?.user?.id) {
        await contentCache.set(cacheOptions, fullContent);
      }
    } catch (streamError) {
      if (!abortController.signal.aborted) {
        console.error('[useContentStreaming] Explanation streaming error:', streamError);
        setError('Failed to load explanation. Please try again.');
      }
      setIsStreaming(false);
    }
  };

  const handleNonStreamingContent = async () => {
    try {
      const currentTopic = outline.find((t) => t.id === selectedTopic);
      if (!currentTopic) return;

      switch (activeMode) {
        case 'summary': {
          const summaryResult = await AIApiService.generateSummary(fileId!, 'key-points');
          setStreamingContent(
            `<div class="summary"><h3>Summary</h3><p>${summaryResult.summary}</p></div>`
          );
          break;
        }

        case 'flashcards': {
          const flashcardsResult = await AIApiService.generateFlashcards(
            fileId!,
            currentTopic.chunkIds
          );
          const flashcardsHtml = flashcardsResult.flashcards
            .map(
              (card, index) => `
            <div class="flashcard mb-4 p-4 border rounded-lg">
              <div class="flashcard-front mb-2">
                <strong>Card ${index + 1}:</strong> ${card.front}
              </div>
              <div class="flashcard-back">
                <strong>Answer:</strong> ${card.back}
              </div>
              <div class="flashcard-difficulty text-sm text-gray-600 mt-2">
                Difficulty: ${card.difficulty}
              </div>
            </div>
          `
            )
            .join('');
          setStreamingContent(
            `<div class="flashcards"><h3>Flashcards (${flashcardsResult.count})</h3>${flashcardsHtml}</div>`
          );
          break;
        }

        case 'quiz': {
          const quizResult = await AIApiService.generateQuiz(
            fileId!,
            'multiple_choice',
            currentTopic.chunkIds
          );
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
      console.error('[useContentStreaming] Error generating content:', error);
      setError('Failed to generate content. Please try again.');
      setIsStreaming(false);
    }
  };

  const clearCache = async () => {
    if (!selectedTopic || !selectedSubtopic || !session?.user?.id) return;

    const cacheOptions: CacheOptions = {
      userId: session.user.id,
      fileId: fileId || '',
      topicId: selectedTopic,
      subtopic: selectedSubtopic,
      mode: activeMode,
      version: fileVersion,
      persona: profile?.persona,
    };

    await contentCache.clear(cacheOptions);
  };

  return {
    streamingContent,
    isStreaming,
    error,
    streamContent,
    clearCache,
  };
}
