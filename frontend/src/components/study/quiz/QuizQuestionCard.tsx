'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { QuizQuestion } from './types';
import { getDifficultyColor } from './utils';

interface QuizQuestionCardProps {
  question: QuizQuestion;
  questionNumber: number;
  userAnswer: string;
  onAnswerSelect: (answer: string) => void;
}

export function QuizQuestionCard({
  question,
  questionNumber,
  userAnswer,
  onAnswerSelect,
}: QuizQuestionCardProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Question {questionNumber}</CardTitle>
          <div className="flex gap-2">
            <Badge className={getDifficultyColor(question.difficulty)}>{question.difficulty}</Badge>
            <Badge variant="outline">{question.topic}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-lg">{question.question}</p>

          {question.type === 'multiple_choice' && question.options && (
            <RadioGroup value={userAnswer || ''} onValueChange={onAnswerSelect}>
              {question.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="text-sm">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {question.type === 'true_false' && (
            <RadioGroup value={userAnswer || ''} onValueChange={onAnswerSelect}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="True" id="true" />
                <Label htmlFor="true">True</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="False" id="false" />
                <Label htmlFor="false">False</Label>
              </div>
            </RadioGroup>
          )}

          {question.type === 'short_answer' && (
            <Input
              placeholder="Type your answer..."
              value={userAnswer || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onAnswerSelect(e.target.value)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
