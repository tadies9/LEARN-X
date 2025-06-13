'use client';

import { useState, useCallback } from 'react';
import { UserPersona } from '@/lib/types/persona';

interface StreamParams {
  type: 'explain' | 'summarize' | 'flashcards' | 'quiz';
  fileId: string;
  topicId?: string;
  selectedText?: string;
  userPersona?: UserPersona | null;
}

export function useContentStream() {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamContent = useCallback(async (params: StreamParams) => {
    setIsStreaming(true);
    setError(null);
    setContent('');

    try {
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: params.fileId,
          mode: params.type,
          topicId: params.topicId,
          selectedText: params.selectedText,
          personaId: params.userPersona?.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to stream content: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process SSE data
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              setIsStreaming(false);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                setContent((prev) => prev + parsed.content);
              }
              if (parsed.error) {
                setError(parsed.error);
                setIsStreaming(false);
                return;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Stream error:', err);
      setError(err instanceof Error ? err.message : 'Failed to stream content');
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const clearContent = useCallback(() => {
    setContent('');
    setError(null);
  }, []);

  return {
    content,
    isStreaming,
    error,
    streamContent,
    clearContent,
  };
}