'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  Clock,
  Target,
  RotateCcw,
  Play,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

interface QuizPracticeProps {
  fileId: string;
  questions: QuizQuestion[];
  timeLimit?: number; // minutes
  onComplete?: (results: QuizResults) => void;
}

interface QuizResults {
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  accuracy: number;
  questionResults: Array<{
    questionId: string;
    correct: boolean;
    userAnswer: string;
    timeSpent: number;
  }>;
  completedAt: Date;
}

export function QuizPractice({
  fileId,
  questions,
  timeLimit = 30,
  onComplete,
}: QuizPracticeProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60);
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [results, setResults] = useState<QuizResults | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Timer effect
  useEffect(() => {
    if (!isStarted || isPaused || showResults) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          completeQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, isPaused, showResults]);

  // Track question start time
  useEffect(() => {
    if (isStarted && !isPaused) {
      setQuestionStartTime(Date.now());
    }
  }, [currentQuestionIndex, isStarted, isPaused]);

  const startQuiz = () => {
    setIsStarted(true);
    setQuestionStartTime(Date.now());
  };

  const pauseQuiz = () => {
    setIsPaused(!isPaused);
    
    if (!isPaused && questionStartTime > 0) {
      // Record time spent on current question
      const timeSpent = Date.now() - questionStartTime;
      setQuestionTimes(prev => ({
        ...prev,
        [currentQuestion.id]: (prev[currentQuestion.id] || 0) + timeSpent,
      }));
    } else if (isPaused) {
      setQuestionStartTime(Date.now());
    }
  };

  const selectAnswer = (answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  };

  const nextQuestion = () => {
    // Record time spent on current question
    if (questionStartTime > 0) {
      const timeSpent = Date.now() - questionStartTime;
      setQuestionTimes(prev => ({
        ...prev,
        [currentQuestion.id]: (prev[currentQuestion.id] || 0) + timeSpent,
      }));
    }

    if (isLastQuestion) {
      completeQuiz();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const completeQuiz = () => {
    const totalTime = (timeLimit * 60 - timeRemaining) * 1000;
    const questionResults = questions.map(question => {
      const userAnswer = userAnswers[question.id] || '';
      const correct = checkAnswer(question, userAnswer);
      
      return {
        questionId: question.id,
        correct,
        userAnswer,
        timeSpent: questionTimes[question.id] || 0,
      };
    });

    const correctCount = questionResults.filter(r => r.correct).length;
    const accuracy = (correctCount / questions.length) * 100;

    const quizResults: QuizResults = {
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      timeSpent: totalTime,
      accuracy,
      questionResults,
      completedAt: new Date(),
    };

    setResults(quizResults);
    setShowResults(true);
    onComplete?.(quizResults);
  };

  const checkAnswer = (question: QuizQuestion, userAnswer: string): boolean => {
    if (question.type === 'multiple_choice') {
      return userAnswer === question.answer;
    } else if (question.type === 'true_false') {
      return userAnswer.toLowerCase() === question.answer.toLowerCase();
    } else if (question.type === 'short_answer') {
      // Simple comparison - could be improved with fuzzy matching
      return userAnswer.toLowerCase().trim() === question.answer.toLowerCase().trim();
    }
    return false;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setTimeRemaining(timeLimit * 60);
    setIsStarted(false);
    setIsPaused(false);
    setShowResults(false);
    setQuestionStartTime(0);
    setQuestionTimes({});
    setResults(null);
  };

  if (!isStarted) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Quiz Practice</h2>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {questions.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Questions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {timeLimit}
                  </div>
                  <div className="text-sm text-muted-foreground">Minutes</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Question Types:</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {Array.from(new Set(questions.map(q => q.type))).map(type => (
                    <Badge key={type} variant="outline">
                      {type.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <Button onClick={startQuiz} size="lg" className="w-full">
                <Play className="mr-2 h-4 w-4" />
                Start Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResults && results) {
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
                <span>{results.correctAnswers} / {results.totalQuestions}</span>
              </div>
              <Progress value={results.accuracy} className="h-2" />
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button onClick={restartQuiz}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Retry Quiz
              </Button>
              <Button variant="outline" onClick={() => setShowResults(false)}>
                Review Answers
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Question Review */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Answer Review</h3>
          {questions.map((question, index) => {
            const result = results.questionResults.find(r => r.questionId === question.id);
            const isCorrect = result?.correct || false;
            
            return (
              <Card key={question.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">Question {index + 1}</span>
                        <Badge className={getDifficultyColor(question.difficulty)}>
                          {question.difficulty}
                        </Badge>
                      </div>
                      <p className="mb-2">{question.question}</p>
                      {result && (
                        <div className="text-sm space-y-1">
                          <div>
                            <span className="font-medium">Your answer: </span>
                            <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                              {result.userAnswer || 'No answer'}
                            </span>
                          </div>
                          {!isCorrect && (
                            <div>
                              <span className="font-medium">Correct answer: </span>
                              <span className="text-green-600">{question.answer}</span>
                            </div>
                          )}
                          <div className="text-muted-foreground">
                            {question.explanation}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Quiz Practice</h2>
          <p className="text-muted-foreground">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span className={cn(
              timeRemaining < 300 && 'text-red-600 font-medium'
            )}>
              {formatTime(timeRemaining)}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={pauseQuiz}>
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>Progress: {Math.round(progress)}%</span>
          <span>Answered: {Object.keys(userAnswers).length}/{questions.length}</span>
        </div>
      </div>

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Question {currentQuestionIndex + 1}</CardTitle>
            <div className="flex gap-2">
              <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
                {currentQuestion.difficulty}
              </Badge>
              <Badge variant="outline">{currentQuestion.topic}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-lg">{currentQuestion.question}</p>
            
            {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
              <RadioGroup
                value={userAnswers[currentQuestion.id] || ''}
                onValueChange={(value) => selectAnswer(value)}
              >
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={option}
                      id={`option-${index}`}
                    />
                    <Label htmlFor={`option-${index}`} className="text-sm">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            
            {currentQuestion.type === 'true_false' && (
              <RadioGroup
                value={userAnswers[currentQuestion.id] || ''}
                onValueChange={(value) => selectAnswer(value)}
              >
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
            
            {currentQuestion.type === 'short_answer' && (
              <Input
                placeholder="Type your answer..."
                value={userAnswers[currentQuestion.id] || ''}
                onChange={(e) => selectAnswer(e.target.value)}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={previousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>
        
        <Button
          onClick={nextQuestion}
          disabled={!userAnswers[currentQuestion.id]}
        >
          {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
        </Button>
      </div>

      {/* Pause Overlay */}
      {isPaused && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card>
            <CardContent className="p-6 text-center">
              <Pause className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Quiz Paused</h3>
              <p className="text-muted-foreground mb-4">
                Click resume to continue your quiz
              </p>
              <Button onClick={pauseQuiz}>
                <Play className="mr-2 h-4 w-4" />
                Resume Quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}