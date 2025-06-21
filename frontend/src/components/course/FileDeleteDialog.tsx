'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { useToast } from '@/components/ui/useToast';
import { fileApi } from '@/lib/api/file';
import type { CourseFile } from '@/lib/types/course';

interface FileDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: CourseFile | null;
  onDeleteComplete: () => void;
}

export function FileDeleteDialog({
  open,
  onOpenChange,
  file,
  onDeleteComplete,
}: FileDeleteDialogProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!file) return;

    setDeleting(true);
    try {
      await fileApi.deleteFile(file.id);

      toast({
        title: 'File deleted',
        description: `"${file.name}" has been permanently deleted.`,
      });

      onDeleteComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete file',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!file) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-3">
            Are you sure you want to delete <strong>"{file.name}"</strong>? This action cannot be
            undone.
            {file.chunks && file.chunks.length > 0 && (
              <span className="block mt-2 text-sm">
                This will also delete {file.chunks.length} processed chunks associated with this
                file.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete File
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
