'use client';

import { Pause, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QuizPauseOverlayProps {
  onResume: () => void;
}

export function QuizPauseOverlay({ onResume }: QuizPauseOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card>
        <CardContent className="p-6 text-center">
          <Pause className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Quiz Paused</h3>
          <p className="text-muted-foreground mb-4">Click resume to continue your quiz</p>
          <Button onClick={onResume}>
            <Play className="mr-2 h-4 w-4" />
            Resume Quiz
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
