import { FileText } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { FileList } from '@/app/(dashboard)/courses/[id]/modules/[moduleId]/components/FileList';
import { EmptyFiles } from '@/app/(dashboard)/courses/[id]/modules/[moduleId]/components/EmptyFiles';

import type { CourseFile } from '@/lib/types/course';

interface FilesSectionProps {
  files: CourseFile[];
  onUpdate: () => void;
  onUpload: () => void;
  onReorder: (fileId: string, newPosition: number) => Promise<void>;
}

export function FilesSection({ files, onUpdate, onUpload, onReorder }: FilesSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Course Materials
        </CardTitle>
        <CardDescription>
          {files.length} {files.length === 1 ? 'file' : 'files'} in this module
        </CardDescription>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <EmptyFiles onUpload={onUpload} />
        ) : (
          <FileList files={files} onUpdate={onUpdate} onReorder={onReorder} />
        )}
      </CardContent>
    </Card>
  );
}