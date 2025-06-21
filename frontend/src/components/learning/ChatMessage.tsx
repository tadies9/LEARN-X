import { Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

import type { Message } from '@/hooks/useAIChat';

interface ChatMessageProps {
  message: Message;
}

function copyMessage(content: string): void {
  navigator.clipboard.writeText(content);
  toast.success('Copied to clipboard');
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
    >
      {message.role === 'assistant' && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3',
          message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {message.role === 'assistant' && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/20">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => copyMessage(message.content)}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <ThumbsDown className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {message.role === 'user' && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  );
}
