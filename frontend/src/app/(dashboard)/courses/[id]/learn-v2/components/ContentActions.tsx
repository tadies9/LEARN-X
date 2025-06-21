import React from 'react';
import {
  BookOpen,
  MessageSquare,
  Brain,
  HelpCircle,
  FileText,
  RefreshCw,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ActiveMode } from '../types/streaming';

interface ContentActionsProps {
  activeMode: ActiveMode;
  onModeChange: (mode: ActiveMode) => void;
  onRegenerate: () => void;
  onSave: () => void;
  isStreaming: boolean;
  hasContent: boolean;
}

export function ContentActions({
  activeMode,
  onModeChange,
  onRegenerate,
  onSave,
  isStreaming,
  hasContent,
}: ContentActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <Tabs value={activeMode} onValueChange={(v) => onModeChange(v as ActiveMode)}>
        <TabsList>
          <TabsTrigger value="explain" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Explain
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <FileText className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="gap-2">
            <Brain className="h-4 w-4" />
            Flashcards
          </TabsTrigger>
          <TabsTrigger value="quiz" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            Quiz
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 ml-4">
        <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isStreaming}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Regenerate
        </Button>
        <Button variant="outline" size="sm" onClick={onSave} disabled={!hasContent}>
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
      </div>
    </div>
  );
}
