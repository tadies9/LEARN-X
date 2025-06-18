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
        // Get auth token
        const token = localStorage.getItem('auth_token');

        const response = await fetch('/api/v1/learn/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
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
                // Handle new structured SSE format
                if (parsed.type === 'content' && parsed.data) {
                  assistantMessage += parsed.data;
                } else if (parsed.type === 'citations' && parsed.data) {
                  // Store citations to add to final message
                  const finalMessage: ChatMessage = {
                    id: messageId,
                    role: 'assistant',
                    content: assistantMessage,
                    timestamp: new Date(),
                    citations: parsed.data,
                  };
                  onMessage?.(finalMessage);
                } else if (parsed.type === 'complete') {
                  // Message complete
                  if (!assistantMessage) return;
                  const finalMessage: ChatMessage = {
                    id: messageId,
                    role: 'assistant',
                    content: assistantMessage,
                    timestamp: new Date(),
                  };
                  onMessage?.(finalMessage);
                  return;
                } else if (parsed.content) {
                  // Fallback for old format
                  assistantMessage += parsed.content;
                } else if (parsed.citations) {
                  // Fallback for old citations format
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
