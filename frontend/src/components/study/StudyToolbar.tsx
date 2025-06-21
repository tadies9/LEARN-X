'use client';

import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import {
  Brain,
  FileText,
  ListChecks,
  BookOpen,
  Highlighter,
  StickyNote,
  Download,
  Timer,
  BarChart3,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudyToolbarProps {
  studyMode: 'explain' | 'summarize' | 'flashcards' | 'quiz';
  onModeChange: (mode: 'explain' | 'summarize' | 'flashcards' | 'quiz') => void;
  selectedText?: string;
  fileId: string;
  onToolAction?: (action: 'highlight' | 'note' | 'timer' | 'stats' | 'export' | 'practice') => void;
}

export function StudyToolbar({
  studyMode,
  onModeChange,
  selectedText,
  fileId: _fileId,
  onToolAction,
}: StudyToolbarProps) {
  const modes = [
    {
      id: 'explain' as const,
      label: 'Explain',
      icon: Brain,
      tooltip: 'Get AI explanations of concepts',
    },
    {
      id: 'summarize' as const,
      label: 'Summarize',
      icon: FileText,
      tooltip: 'Generate summaries of sections',
    },
    {
      id: 'flashcards' as const,
      label: 'Flashcards',
      icon: ListChecks,
      tooltip: 'Create flashcards for memorization',
    },
    {
      id: 'quiz' as const,
      label: 'Quiz',
      icon: BookOpen,
      tooltip: 'Test your understanding',
    },
  ];

  const tools = [
    {
      id: 'highlight' as const,
      icon: Highlighter,
      tooltip: 'Highlight text',
      onClick: () => onToolAction?.('highlight'),
    },
    {
      id: 'note' as const,
      icon: StickyNote,
      tooltip: 'Add note',
      onClick: () => onToolAction?.('note'),
    },
    {
      id: 'practice' as const,
      icon: Zap,
      tooltip: 'Practice mode',
      onClick: () => onToolAction?.('practice'),
    },
    {
      id: 'timer' as const,
      icon: Timer,
      tooltip: 'Study timer',
      onClick: () => onToolAction?.('timer'),
    },
    {
      id: 'stats' as const,
      icon: BarChart3,
      tooltip: 'View statistics',
      onClick: () => onToolAction?.('stats'),
    },
    {
      id: 'export' as const,
      icon: Download,
      tooltip: 'Export content',
      onClick: () => onToolAction?.('export'),
    },
  ];

  return (
    <div className="flex items-center justify-between border-b bg-background px-4 py-2">
      {/* Study modes */}
      <div className="flex items-center gap-1">
        <TooltipProvider>
          {modes.map((mode) => (
            <Tooltip key={mode.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={studyMode === mode.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onModeChange(mode.id)}
                  className={cn('gap-2')}
                >
                  <mode.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{mode.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{mode.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>

      {/* Tools */}
      <div className="flex items-center gap-1">
        <Separator orientation="vertical" className="mx-2 h-6" />

        <TooltipProvider>
          {tools.map((tool) => (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={tool.onClick} className="h-8 w-8">
                  <tool.icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tool.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>

      {/* Selected text indicator */}
      {selectedText && (
        <div className="ml-4 flex items-center gap-2 text-sm text-muted-foreground">
          <span>Selected:</span>
          <span className="max-w-[200px] truncate font-medium">"{selectedText}"</span>
        </div>
      )}
    </div>
  );
}
