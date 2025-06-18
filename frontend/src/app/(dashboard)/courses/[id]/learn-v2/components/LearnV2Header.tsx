import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ContentActions } from './ContentActions';
import { ActiveMode } from '../types/streaming';

interface LearnV2HeaderProps {
  fileName: string | null;
  activeMode: ActiveMode;
  onModeChange: (mode: ActiveMode) => void;
  onRegenerate: () => void;
  onSave: () => void;
  isStreaming: boolean;
  hasContent: boolean;
}

export function LearnV2Header({
  fileName,
  activeMode,
  onModeChange,
  onRegenerate,
  onSave,
  isStreaming,
  hasContent,
}: LearnV2HeaderProps) {
  const router = useRouter();

  return (
    <div className="border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{fileName || 'Learning Session'}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>AI-Powered Learning</span>
          </div>
        </div>
      </div>

      <ContentActions
        activeMode={activeMode}
        onModeChange={onModeChange}
        onRegenerate={onRegenerate}
        onSave={onSave}
        isStreaming={isStreaming}
        hasContent={hasContent}
      />
    </div>
  );
}
