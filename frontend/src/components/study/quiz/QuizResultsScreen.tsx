'use client';

import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { QuizResults } from './types';
import { formatTime } from './utils';

interface QuizResultsScreenProps {
  results: QuizResults;
  onRestart: () => void;
  onReviewAnswers: () => void;
}

export function QuizResultsScreen({ results, onRestart, onReviewAnswers }: QuizResultsScreenProps) {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-3xl font-bold mb-6 text-center">Quiz Results</h2>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {results.accuracy.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {formatTime(Math.floor(results.timeSpent / 1000))}
              </div>
              <div className="text-sm text-muted-foreground">Time Spent</div>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span>Correct Answers:</span>
              <span>
                {results.correctAnswers} / {results.totalQuestions}
              </span>
            </div>
            <Progress value={results.accuracy} className="h-2" />
          </div>

          <div className="flex gap-2 justify-center">
            <Button onClick={onRestart}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry Quiz
            </Button>
            <Button variant="outline" onClick={onReviewAnswers}>
              Review Answers
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
