'use client';

import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QuizQuestion } from './types';

interface QuizStartScreenProps {
  questions: QuizQuestion[];
  timeLimit: number;
  onStart: () => void;
}

export function QuizStartScreen({ questions, timeLimit, onStart }: QuizStartScreenProps) {
  const questionTypes = Array.from(new Set(questions.map((q) => q.type)));

  return (
    <div className="max-w-2xl mx-auto p-6 text-center">
      <h2 className="text-3xl font-bold mb-4">Quiz Practice</h2>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{questions.length}</div>
                <div className="text-sm text-muted-foreground">Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{timeLimit}</div>
                <div className="text-sm text-muted-foreground">Minutes</div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Question Types:</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {questionTypes.map((type) => (
                  <Badge key={type} variant="outline">
                    {type.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>

            <Button onClick={onStart} size="lg" className="w-full">
              <Play className="mr-2 h-4 w-4" />
              Start Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
