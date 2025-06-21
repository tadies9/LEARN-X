'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import {
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  SkipForward,
  Settings,
  Play,
  Pause,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  reviewCount: number;
  lastReviewed?: Date;
  nextReview?: Date;
  confidence: number; // 0-100
}

interface FlashcardPracticeProps {
  fileId: string;
  flashcards: Flashcard[];
  onComplete?: (results: FlashcardSession) => void;
}

interface FlashcardSession {
  totalCards: number;
  correctCards: number;
  difficultCards: string[];
  timeSpent: number;
  completedAt: Date;
}

const SPACED_REPETITION_INTERVALS = {
  easy: [1, 6, 14, 30, 90], // days
  medium: [1, 4, 10, 25, 60], // days
  hard: [1, 3, 7, 16, 35], // days
};

export function FlashcardPractice({ fileId, flashcards, onComplete }: FlashcardPracticeProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [session, setSession] = useState<{
    startTime: Date;
    correctCount: number;
    difficultCards: string[];
    reviewedCards: Set<string>;
  }>({
    startTime: new Date(),
    correctCount: 0,
    difficultCards: [],
    reviewedCards: new Set(),
  });
  const [showSettings, setShowSettings] = useState(false);
  const [autoFlip, setAutoFlip] = useState(false);
  const [flipDelay, setFlipDelay] = useState(3000);
  const [shuffled, setShuffled] = useState(false);
  const [practiceCards, setPracticeCards] = useState(flashcards);

  const currentCard = practiceCards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / practiceCards.length) * 100;

  // Initialize practice session
  useEffect(() => {
    if (shuffled) {
      setPracticeCards([...flashcards].sort(() => Math.random() - 0.5));
    } else {
      setPracticeCards(flashcards);
    }
  }, [flashcards, shuffled]);

  // Auto-flip functionality
  useEffect(() => {
    if (!autoFlip || isFlipped) return;

    const timer = setTimeout(() => {
      setIsFlipped(true);
    }, flipDelay);

    return () => clearTimeout(timer);
  }, [autoFlip, flipDelay, isFlipped, currentCardIndex]);

  // Handle card rating
  const rateCard = async (rating: 'easy' | 'medium' | 'hard') => {
    if (!currentCard) return;

    // Update session stats
    setSession((prev) => ({
      ...prev,
      correctCount: rating === 'easy' ? prev.correctCount + 1 : prev.correctCount,
      difficultCards:
        rating === 'hard' ? [...prev.difficultCards, currentCard.id] : prev.difficultCards,
      reviewedCards: new Set([...prev.reviewedCards, currentCard.id]),
    }));

    // Calculate next review date using spaced repetition
    const intervals = SPACED_REPETITION_INTERVALS[rating];
    const currentInterval = Math.min(currentCard.reviewCount, intervals.length - 1);
    const nextReviewDays = intervals[currentInterval];
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + nextReviewDays);

    // Update card data (this would normally be saved to backend)
    const updatedCard = {
      ...currentCard,
      reviewCount: currentCard.reviewCount + 1,
      lastReviewed: new Date(),
      nextReview: nextReviewDate,
      confidence: rating === 'easy' ? 100 : rating === 'medium' ? 70 : 30,
    };

    // TODO: Save to backend
    await saveCardProgress(updatedCard);

    nextCard();
  };

  const saveCardProgress = async (card: Flashcard) => {
    try {
      await fetch('/api/flashcards/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: card.id,
          fileId,
          confidence: card.confidence,
          reviewCount: card.reviewCount,
          lastReviewed: card.lastReviewed,
          nextReview: card.nextReview,
        }),
      });
    } catch (error) {
      console.error('Failed to save card progress:', error);
    }
  };

  const nextCard = () => {
    if (currentCardIndex < practiceCards.length - 1) {
      setCurrentCardIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      completeSession();
    }
  };

  const previousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  };

  const skipCard = () => {
    nextCard();
  };

  const completeSession = () => {
    const sessionResults: FlashcardSession = {
      totalCards: practiceCards.length,
      correctCards: session.correctCount,
      difficultCards: session.difficultCards,
      timeSpent: Date.now() - session.startTime.getTime(),
      completedAt: new Date(),
    };

    onComplete?.(sessionResults);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentCard) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-semibold mb-2">No flashcards available</h3>
        <p className="text-muted-foreground">
          Generate flashcards from your content to start practicing.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Flashcard Practice</h2>
          <p className="text-muted-foreground">
            Card {currentCardIndex + 1} of {practiceCards.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
          <span>Progress: {Math.round(progress)}%</span>
          <span>
            Correct: {session.correctCount}/{session.reviewedCards.size}
          </span>
        </div>
      </div>

      {/* Flashcard */}
      <Card className="mb-6 min-h-[300px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
        <CardContent className="p-8 h-full flex flex-col justify-center">
          <div className="text-center">
            {!isFlipped ? (
              <>
                <div className="text-sm text-muted-foreground mb-4">Front</div>
                <div className="text-xl font-medium">{currentCard.front}</div>
                <div className="mt-6 text-sm text-muted-foreground">Click to reveal answer</div>
              </>
            ) : (
              <>
                <div className="text-sm text-muted-foreground mb-4">Back</div>
                <div className="text-xl font-medium">{currentCard.back}</div>
                <div className="mt-6 flex justify-center gap-2">
                  <Badge className={getDifficultyColor(currentCard.difficulty)}>
                    {currentCard.difficulty}
                  </Badge>
                  {currentCard.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        {!isFlipped ? (
          <Button onClick={() => setIsFlipped(true)}>Show Answer</Button>
        ) : (
          <>
            <Button variant="outline" className="text-red-600" onClick={() => rateCard('hard')}>
              <ThumbsDown className="mr-2 h-4 w-4" />
              Hard
            </Button>
            <Button
              variant="outline"
              className="text-yellow-600"
              onClick={() => rateCard('medium')}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Medium
            </Button>
            <Button variant="outline" className="text-green-600" onClick={() => rateCard('easy')}>
              <ThumbsUp className="mr-2 h-4 w-4" />
              Easy
            </Button>
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="ghost" onClick={previousCard} disabled={currentCardIndex === 0}>
          Previous
        </Button>
        <Button variant="ghost" onClick={skipCard}>
          <SkipForward className="mr-2 h-4 w-4" />
          Skip
        </Button>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Practice Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Auto-flip cards</label>
              <Button variant="outline" size="sm" onClick={() => setAutoFlip(!autoFlip)}>
                {autoFlip ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>

            {autoFlip && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Flip delay (seconds)</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={flipDelay / 1000}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFlipDelay(parseInt(e.target.value) * 1000)
                  }
                  className="w-full"
                />
                <div className="text-sm text-muted-foreground">{flipDelay / 1000} seconds</div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Shuffle cards</label>
              <Button variant="outline" size="sm" onClick={() => setShuffled(!shuffled)}>
                {shuffled ? 'On' : 'Off'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
