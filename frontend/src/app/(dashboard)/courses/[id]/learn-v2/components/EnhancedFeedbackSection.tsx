import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Meh } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIApiService } from '@/lib/api/ai';

interface EnhancedFeedbackSectionProps {
  quickNote: string;
  onQuickNoteChange: (note: string) => void;
  onReaction: (reaction: 'positive' | 'neutral' | 'negative') => void;
  currentReaction: 'positive' | 'neutral' | 'negative' | null;
}

export function EnhancedFeedbackSection({
  quickNote,
  onQuickNoteChange,
  onReaction,
  currentReaction,
}: EnhancedFeedbackSectionProps) {
  const handleReaction = async (reactionType: 'positive' | 'neutral' | 'negative') => {
    onReaction(reactionType);

    // Send feedback to backend using new API
    try {
      await AIApiService.submitFeedback({
        contentId: `default-intro`,
        helpful: reactionType === 'positive',
        rating: reactionType === 'positive' ? 5 : reactionType === 'neutral' ? 3 : 1,
        comments: quickNote || undefined,
      });
    } catch (err) {
      // Error already handled in specific catch blocks
    }
  };

  return (
    <div className="max-w-screen-lg mx-auto mt-8 pt-6 border-t">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Was this helpful?</span>
          <div className="flex items-center gap-2">
            <Button
              variant={currentReaction === 'positive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleReaction('positive')}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              variant={currentReaction === 'neutral' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleReaction('neutral')}
            >
              <Meh className="h-4 w-4" />
            </Button>
            <Button
              variant={currentReaction === 'negative' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleReaction('negative')}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Note */}
      <div className="mt-4">
        <textarea
          value={quickNote}
          onChange={(e) => onQuickNoteChange(e.target.value)}
          placeholder="Add a quick note or feedback..."
          className="w-full p-3 border rounded-lg text-sm resize-none"
          rows={2}
        />
      </div>
    </div>
  );
}
