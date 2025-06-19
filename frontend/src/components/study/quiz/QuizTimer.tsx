'use client';

import { Clock, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatTime } from './utils';

interface QuizTimerProps {
  timeRemaining: number;
  isPaused: boolean;
  onPauseToggle: () => void;
}

export function QuizTimer({ timeRemaining, isPaused, onPauseToggle }: QuizTimerProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4" />
        <span className={cn(timeRemaining < 300 && 'text-red-600 font-medium')}>
          {formatTime(timeRemaining)}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={onPauseToggle}>
        {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
      </Button>
    </div>
  );
}
