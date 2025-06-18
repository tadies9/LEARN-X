'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { UserPersona } from '@/lib/types/persona';
import { useChat } from '@/hooks/useChat';
import { Send, Bot, User, Sparkles, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Components } from 'react-markdown';
import { ReactNode } from 'react';

interface StudyChatProps {
  fileId: string;
  currentPage?: number;
  selectedText?: string;
  userPersona?: UserPersona | null;
}

interface Message {
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

export function StudyChat({ fileId, currentPage, selectedText, userPersona }: StudyChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { sendMessage, isLoading } = useChat({
    fileId,
    onMessage: (message) => {
      setMessages((prev) => [...prev, message]);
    },
  });

  // Suggested questions based on context
  const suggestedQuestions = [
    selectedText && `What does "${selectedText.substring(0, 30)}..." mean?`,
    currentPage && `Can you explain the key concepts on page ${currentPage}?`,
    'What are the main takeaways from this section?',
    'Can you provide a real-world example?',
    'How does this relate to what we learned earlier?',
  ].filter(Boolean);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Send with context
    await sendMessage({
      message: input,
      context: {
        currentPage,
        selectedText,
        userPersona,
      },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: Show toast notification
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';

    return (
      <div key={message.id} className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
        {!isUser && (
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}

        <div className={cn('max-w-[80%]', isUser && 'order-first')}>
          <Card className={cn('p-3', isUser && 'bg-primary text-primary-foreground')}>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  code: (props: any) => {
                    const { node, className, children, ...rest } = props;
                    const inline = node?.position === undefined;
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      <div className="relative">
                        <SyntaxHighlighter
                          style={oneDark as { [key: string]: React.CSSProperties }}
                          language={match[1]}
                          PreTag="div"
                          {...rest}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-2 h-6 w-6"
                          onClick={() => copyToClipboard(String(children))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <code className={className} {...rest}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Citations */}
            {message.citations && message.citations.length > 0 && (
              <div className="mt-2 space-y-1 border-t pt-2">
                <p className="text-xs font-medium">Sources:</p>
                {message.citations.map((citation, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground">
                    Page {citation.page}: "{citation.text.substring(0, 50)}..."
                  </div>
                ))}
              </div>
            )}

            {/* Message actions */}
            {!isUser && (
              <div className="mt-2 flex gap-2">
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ThumbsUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ThumbsDown className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(message.content)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
          </Card>

          <p className="mt-1 text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString()}
          </p>
        </div>

        {isUser && (
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4" />
          AI Study Assistant
        </h3>
        <p className="text-sm text-muted-foreground">Ask questions about the content</p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Start a conversation or try a suggested question
              </p>

              {/* Suggested questions */}
              <div className="mt-4 space-y-2">
                {suggestedQuestions.slice(0, 3).map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="w-full text-left"
                    onClick={() => {
                      setInput(question || '');
                      inputRef.current?.focus();
                    }}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(renderMessage)
          )}

          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <Card className="p-3">
                <div className="flex gap-1">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0.2s]"></div>
                  <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0.4s]"></div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question..."
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
