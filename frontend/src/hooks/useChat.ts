'use client';

import { useState, useCallback } from 'react';
import { UserPersona } from '@/lib/types/persona';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: Array<{
    chunkId: string;
    page: number;
    text: string;
  }>;
}

interface SendMessageParams {
  message: string;
  context?: {
    currentPage?: number;
    selectedText?: string;
    userPersona?: UserPersona | null;
  };
}

interface UseChatOptions {
  fileId: string;
  onMessage?: (message: ChatMessage) => void;
}

export function useChat({ fileId, onMessage }: UseChatOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async ({ message, context }: SendMessageParams) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId,
            message,
            currentPage: context?.currentPage,
            selectedText: context?.selectedText,
            personaId: context?.userPersona?.id,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let assistantMessage = '';
        const messageId = Date.now().toString();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                // Create final message with full content
                const finalMessage: ChatMessage = {
                  id: messageId,
                  role: 'assistant',
                  content: assistantMessage,
                  timestamp: new Date(),
                };
                onMessage?.(finalMessage);
                return;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  assistantMessage += parsed.content;
                }
                if (parsed.citations) {
                  // Citations will be added to final message
                }
              } catch (e) {
                console.error('Failed to parse chat data:', e);
              }
            }
          }
        }
      } catch (err) {
        console.error('Chat error:', err);
        setError(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setIsLoading(false);
      }
    },
    [fileId, onMessage]
  );

  return {
    sendMessage,
    isLoading,
    error,
  };
}