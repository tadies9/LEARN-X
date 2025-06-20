'use client';

import { Button } from '@/components/ui/button';
import { BookOpen, X } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onGenerateStudyPack: () => void;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedCount,
  onGenerateStudyPack,
  onClearSelection,
}: BulkActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedCount} {selectedCount === 1 ? 'file' : 'files'} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>

        <Button onClick={onGenerateStudyPack} size="lg">
          <BookOpen className="h-4 w-4 mr-2" />
          Generate Study Pack
        </Button>
      </div>
    </div>
  );
}
