import { Sparkles, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ChatHeaderProps {
  onClearChat: () => void;
}

export function ChatHeader({ onClearChat }: ChatHeaderProps) {
  return (
    <div className="border-b p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-primary/10 p-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">AI Learning Assistant</h3>
            <p className="text-xs text-muted-foreground">
              Ask questions about your learning material
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClearChat}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}