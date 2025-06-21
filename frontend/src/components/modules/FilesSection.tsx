'use client';

import { useState } from 'react';
import { FileText, Grid, List } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/ToggleGroup';

import { FileList } from '@/app/(dashboard)/courses/[id]/modules/[moduleId]/components/FileList';
import { FileGrid } from '@/app/(dashboard)/courses/[id]/modules/[moduleId]/components/FileGrid';
import { EmptyFiles } from '@/app/(dashboard)/courses/[id]/modules/[moduleId]/components/EmptyFiles';

import type { CourseFile } from '@/lib/types/course';

interface FilesSectionProps {
  files: CourseFile[];
  onUpdate: () => void;
  onUpload: () => void;
  onReorder: (fileId: string, newPosition: number) => Promise<void>;
}

export function FilesSection({ files, onUpdate, onUpload, onReorder }: FilesSectionProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Course Materials
            </CardTitle>
            <CardDescription>
              {files.length} {files.length === 1 ? 'file' : 'files'} in this module
            </CardDescription>
          </div>
          {files.length > 0 && (
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(value) => value && setViewMode(value as 'list' | 'grid')}
            >
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <Grid className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <EmptyFiles onUpload={onUpload} />
        ) : viewMode === 'list' ? (
          <FileList files={files} onUpdate={onUpdate} onReorder={onReorder} />
        ) : (
          <FileGrid files={files} onUpdate={onUpdate} />
        )}
      </CardContent>
    </Card>
  );
}
