'use client';

import { BookOpen, FileText, Brain, HelpCircle, MessageSquare } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudyMode } from '../types/study';

interface StudyModeSelectorProps {
  activeMode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
}

export function StudyModeSelector({ activeMode, onModeChange }: StudyModeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Tabs value={activeMode} onValueChange={(v) => onModeChange(v as StudyMode)}>
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
    </div>
  );
}
