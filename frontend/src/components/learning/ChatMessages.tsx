import type { RefObject } from 'react';

import { Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { ScrollArea } from '@/components/ui/ScrollArea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { ChatMessage } from './ChatMessage';

import type { Message } from '@/hooks/useAIChat';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  scrollAreaRef: RefObject<HTMLDivElement>;
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center text-muted-foreground py-8"
    >
      <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary/20" />
      <p className="text-sm">
        Hi! I'm your AI learning assistant. Ask me anything about your course material.
      </p>
    </motion.div>
  );
}

function LoadingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
      </Avatar>
      <div className="bg-muted rounded-lg px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    </motion.div>
  );
}

export function ChatMessages({ messages, isLoading, scrollAreaRef }: ChatMessagesProps) {
  return (
    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
      <AnimatePresence initial={false}>
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && <LoadingIndicator />}
          </div>
        )}
      </AnimatePresence>
    </ScrollArea>
  );
}
