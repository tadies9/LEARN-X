import { useState, useRef, useEffect } from 'react';

import { toast } from 'sonner';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UseAIChatProps {
  initialMessages?: Message[];
  onSendMessage?: (message: string) => Promise<string>;
}

export function useAIChat({ initialMessages = [], onSendMessage }: UseAIChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (): Promise<void> => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = onSendMessage
        ? await onSendMessage(userMessage.content)
        : `I understand you're asking about "${userMessage.content}". Let me explain this concept using an analogy that might help you understand better...`;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast.error('Failed to get AI response. Please try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = (): void => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    scrollAreaRef,
    inputRef,
    handleSend,
    clearChat,
  };
}