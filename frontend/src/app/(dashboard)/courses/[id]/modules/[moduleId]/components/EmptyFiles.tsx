'use client';

import { FileUp } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface EmptyFilesProps {
  onUpload: () => void;
}

export function EmptyFiles({ onUpload }: EmptyFilesProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <FileUp className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium mb-1">No files yet</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Upload course materials to help your students learn
      </p>
      <Button onClick={onUpload} size="sm">
        <FileUp className="mr-2 h-4 w-4" />
        Upload Files
      </Button>
    </div>
  );
}
