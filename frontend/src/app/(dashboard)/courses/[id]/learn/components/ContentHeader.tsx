'use client';

import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StudyModeSelector } from './StudyModeSelector';
import { StudyMode } from '../types/study';

interface ContentHeaderProps {
  fileName: string;
  overallProgress: number;
  activeMode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
  onBackClick: () => void;
}

export function ContentHeader({
  fileName,
  overallProgress,
  activeMode,
  onModeChange,
  onBackClick,
}: ContentHeaderProps) {
  return (
    <div className="border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBackClick}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{fileName || 'Learning Session'}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Progress: {Math.round(overallProgress)}%</span>
            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <StudyModeSelector activeMode={activeMode} onModeChange={onModeChange} />
    </div>
  );
}
