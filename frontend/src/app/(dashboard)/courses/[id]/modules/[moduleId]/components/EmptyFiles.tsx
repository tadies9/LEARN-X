'use client';

import { FileText, BookOpen, Upload } from 'lucide-react';

import { Button } from '@/components/ui/Button';

interface EmptyFilesProps {
  onUpload: () => void;
}

export function EmptyFiles({ onUpload }: EmptyFilesProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="rounded-full bg-muted p-6 mb-6">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No course materials yet</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-8">
        Upload PDFs, documents, presentations, and other learning materials to start building your
        course content.
      </p>
      <Button onClick={onUpload} size="lg" className="gap-2">
        <Upload className="h-4 w-4" />
        Upload Your First File
      </Button>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="p-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 w-fit mx-auto mb-2">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-xs text-muted-foreground">PDFs & Documents</p>
        </div>
        <div className="p-4">
          <div className="rounded-lg bg-purple-50 dark:bg-purple-950 p-3 w-fit mx-auto mb-2">
            <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-xs text-muted-foreground">Study Materials</p>
        </div>
        <div className="p-4">
          <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3 w-fit mx-auto mb-2">
            <Upload className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-xs text-muted-foreground">Easy Upload</p>
        </div>
      </div>
    </div>
  );
}
