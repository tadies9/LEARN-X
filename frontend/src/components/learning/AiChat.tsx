'use client';

import { Card } from '@/components/ui/card';
import { useAIChat, type Message } from '@/hooks/useAIChat';

import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';

interface AIChatProps {
  contextId?: string;
  initialMessages?: Message[];
  onSendMessage?: (message: string) => Promise<string>;
}

export function AIChat({ contextId, initialMessages = [], onSendMessage }: AIChatProps) {
  const { messages, input, setInput, isLoading, scrollAreaRef, inputRef, handleSend, clearChat } =
    useAIChat({ initialMessages, onSendMessage });

  return (
    <Card className="flex flex-col h-full">
      <ChatHeader onClearChat={clearChat} />
      <ChatMessages messages={messages} isLoading={isLoading} scrollAreaRef={scrollAreaRef} />
      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSend={handleSend}
        inputRef={inputRef}
      />
    </Card>
  );
}
