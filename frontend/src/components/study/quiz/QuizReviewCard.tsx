'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { QuizQuestion } from './types';
import { getDifficultyColor } from './utils';

interface QuizReviewCardProps {
  question: QuizQuestion;
  questionNumber: number;
  userAnswer: string;
  isCorrect: boolean;
}

export function QuizReviewCard({
  question,
  questionNumber,
  userAnswer,
  isCorrect,
}: QuizReviewCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {isCorrect ? (
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">Question {questionNumber}</span>
              <Badge className={getDifficultyColor(question.difficulty)}>
                {question.difficulty}
              </Badge>
            </div>
            <p className="mb-2">{question.question}</p>
            <div className="text-sm space-y-1">
              <div>
                <span className="font-medium">Your answer: </span>
                <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                  {userAnswer || 'No answer'}
                </span>
              </div>
              {!isCorrect && (
                <div>
                  <span className="font-medium">Correct answer: </span>
                  <span className="text-green-600">{question.answer}</span>
                </div>
              )}
              <div className="text-muted-foreground">{question.explanation}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
