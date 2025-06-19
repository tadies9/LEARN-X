'use client';

import { Progress } from '@/components/ui/progress';

interface QuizProgressProps {
  currentIndex: number;
  totalQuestions: number;
  answeredCount: number;
}

export function QuizProgress({ currentIndex, totalQuestions, answeredCount }: QuizProgressProps) {
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="mb-6">
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between mt-2 text-sm text-muted-foreground">
        <span>Progress: {Math.round(progress)}%</span>
        <span>
          Answered: {answeredCount}/{totalQuestions}
        </span>
      </div>
    </div>
  );
}
