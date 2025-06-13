'use client';

import { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, ChevronRight, Trophy, RefreshCw, Brain } from 'lucide-react';
import confetti from 'canvas-confetti';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizComponentProps {
  title: string;
  questions: Question[];
  onComplete?: (score: number) => void;
}

export function QuizComponent({ title, questions, onComplete }: QuizComponentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showFinalResults, setShowFinalResults] = useState(false);

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleSubmitAnswer = () => {
    const answerIndex = parseInt(selectedAnswer);
    const isCorrect = answerIndex === question.correctAnswer;

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setAnswers([...answers, answerIndex]);
    setShowResult(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer('');
      setShowResult(false);
    } else {
      // Quiz completed
      setShowFinalResults(true);
      if (score / questions.length >= 0.8) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
      onComplete?.(score);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer('');
    setShowResult(false);
    setScore(0);
    setAnswers([]);
    setShowFinalResults(false);
  };

  if (showFinalResults) {
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <Card className="p-8 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <Trophy
            className={`h-16 w-16 mx-auto mb-4 ${
              percentage >= 80 ? 'text-warning' : 'text-muted-foreground'
            }`}
          />
        </motion.div>

        <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
        <p className="text-lg mb-6">
          You scored <span className="text-primary font-bold">{score}</span> out of{' '}
          <span className="font-bold">{questions.length}</span>
        </p>

        <div className="max-w-xs mx-auto mb-6">
          <Progress value={percentage} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">{percentage}% Correct</p>
        </div>

        <div className="space-y-3">
          <Button onClick={resetQuiz} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retake Quiz
          </Button>

          {percentage >= 80 && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-success font-medium"
            >
              🎉 Excellent work! You've mastered this material!
            </motion.p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <span className="text-sm text-muted-foreground">
            {currentQuestion + 1} of {questions.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="space-y-6">
            <h4 className="text-lg font-medium">{question.question}</h4>

            <RadioGroup
              value={selectedAnswer}
              onValueChange={setSelectedAnswer}
              disabled={showResult}
            >
              <div className="space-y-3">
                {question.options.map((option, index) => {
                  const isSelected = selectedAnswer === index.toString();
                  const isCorrect = index === question.correctAnswer;
                  const showCorrect = showResult && isCorrect;
                  const showIncorrect = showResult && isSelected && !isCorrect;

                  return (
                    <motion.div
                      key={index}
                      whileHover={{ scale: showResult ? 1 : 1.02 }}
                      whileTap={{ scale: showResult ? 1 : 0.98 }}
                    >
                      <Label
                        htmlFor={`option-${index}`}
                        className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-all ${
                          showCorrect
                            ? 'border-success bg-success/10'
                            : showIncorrect
                              ? 'border-destructive bg-destructive/10'
                              : isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <RadioGroupItem
                          value={index.toString()}
                          id={`option-${index}`}
                          className="flex-shrink-0"
                        />
                        <span className="flex-1">{option}</span>
                        {showCorrect && <CheckCircle className="h-5 w-5 text-success" />}
                        {showIncorrect && <XCircle className="h-5 w-5 text-destructive" />}
                      </Label>
                    </motion.div>
                  );
                })}
              </div>
            </RadioGroup>

            {showResult && question.explanation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-muted rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <Brain className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Explanation</p>
                    <p className="text-sm text-muted-foreground">{question.explanation}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={resetQuiz} disabled={!showResult}>
                Start Over
              </Button>

              {!showResult ? (
                <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer}>
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={handleNextQuestion}>
                  {currentQuestion < questions.length - 1 ? (
                    <>
                      Next Question
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </>
                  ) : (
                    'View Results'
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}
