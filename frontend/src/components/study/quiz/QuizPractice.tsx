'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { QuizResults, QuizPracticeProps } from './types';
import { checkAnswer } from './utils';
import { QuizStartScreen } from './QuizStartScreen';
import { QuizResultsScreen } from './QuizResultsScreen';
import { QuizTimer } from './QuizTimer';
import { QuizProgress } from './QuizProgress';
import { QuizQuestionCard } from './QuizQuestionCard';
import { QuizReviewCard } from './QuizReviewCard';
import { QuizPauseOverlay } from './QuizPauseOverlay';

export function QuizPractice({ fileId: _fileId, questions, timeLimit = 30, onComplete }: QuizPracticeProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(timeLimit * 60);
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [results, setResults] = useState<QuizResults | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Timer effect
  useEffect(() => {
    if (!isStarted || isPaused || showResults) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
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
      setQuestionTimes((prev) => ({
        ...prev,
        [currentQuestion.id]: (prev[currentQuestion.id] || 0) + timeSpent,
      }));
    } else if (isPaused) {
      setQuestionStartTime(Date.now());
    }
  };

  const selectAnswer = (answer: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  };

  const nextQuestion = () => {
    // Record time spent on current question
    if (questionStartTime > 0) {
      const timeSpent = Date.now() - questionStartTime;
      setQuestionTimes((prev) => ({
        ...prev,
        [currentQuestion.id]: (prev[currentQuestion.id] || 0) + timeSpent,
      }));
    }

    if (isLastQuestion) {
      completeQuiz();
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const completeQuiz = () => {
    const totalTime = (timeLimit * 60 - timeRemaining) * 1000;
    const questionResults = questions.map((question) => {
      const userAnswer = userAnswers[question.id] || '';
      const correct = checkAnswer(question, userAnswer);

      return {
        questionId: question.id,
        correct,
        userAnswer,
        timeSpent: questionTimes[question.id] || 0,
      };
    });

    const correctCount = questionResults.filter((r) => r.correct).length;
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

  const restartQuiz = () => {
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setTimeRemaining(timeLimit * 60);
    setIsStarted(false);
    setIsPaused(false);
    setShowResults(false);
    setShowReview(false);
    setQuestionStartTime(0);
    setQuestionTimes({});
    setResults(null);
  };

  // Show start screen
  if (!isStarted) {
    return <QuizStartScreen questions={questions} timeLimit={timeLimit} onStart={startQuiz} />;
  }

  // Show results screen
  if (showResults && results && !showReview) {
    return (
      <QuizResultsScreen
        results={results}
        onRestart={restartQuiz}
        onReviewAnswers={() => setShowReview(true)}
      />
    );
  }

  // Show review screen
  if (showReview && results) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Answer Review</h2>
        <Button onClick={() => setShowReview(false)} className="mb-6">
          Back to Results
        </Button>
        <div className="space-y-4">
          {questions.map((question, index) => {
            const result = results.questionResults.find((r) => r.questionId === question.id);
            const isCorrect = result?.correct || false;

            return (
              <QuizReviewCard
                key={question.id}
                question={question}
                questionNumber={index + 1}
                userAnswer={result?.userAnswer || ''}
                isCorrect={isCorrect}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Show active quiz
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
        <QuizTimer timeRemaining={timeRemaining} isPaused={isPaused} onPauseToggle={pauseQuiz} />
      </div>

      {/* Progress */}
      <QuizProgress
        currentIndex={currentQuestionIndex}
        totalQuestions={questions.length}
        answeredCount={Object.keys(userAnswers).length}
      />

      {/* Question Card */}
      <QuizQuestionCard
        question={currentQuestion}
        questionNumber={currentQuestionIndex + 1}
        userAnswer={userAnswers[currentQuestion.id]}
        onAnswerSelect={selectAnswer}
      />

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={previousQuestion} disabled={currentQuestionIndex === 0}>
          Previous
        </Button>

        <Button onClick={nextQuestion} disabled={!userAnswers[currentQuestion.id]}>
          {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
        </Button>
      </div>

      {/* Pause Overlay */}
      {isPaused && <QuizPauseOverlay onResume={pauseQuiz} />}
    </div>
  );
}
