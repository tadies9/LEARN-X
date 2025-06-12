'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ButtonLoader } from '@/components/ui/button-loader';
import { useToast } from '@/components/ui/use-toast';
import { updateFileSchema, type UpdateFileData } from '@/lib/validations/course';
import { fileApi } from '@/lib/api/file';
import type { CourseFile } from '@/lib/types/course';

interface EditFileDialogProps {
  file: CourseFile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditFileDialog({ file, open, onOpenChange, onSuccess }: EditFileDialogProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateFileData>({
    resolver: zodResolver(updateFileSchema),
    defaultValues: {
      name: file.name,
      description: file.description || '',
    },
  });

  useEffect(() => {
    reset({
      name: file.name,
      description: file.description || '',
    });
  }, [file, reset]);

  const onSubmit = async (data: UpdateFileData) => {
    setIsUpdating(true);
    try {
      await fileApi.updateFile(file.id, data);

      toast({
        title: 'File updated',
        description: 'File details have been updated successfully.',
      });

      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit File Details</DialogTitle>
            <DialogDescription>Update file information</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">File Name *</Label>
              <Input id="name" {...register('name')} disabled={isUpdating} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="What is this file about?"
                {...register('description')}
                disabled={isUpdating}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              <ButtonLoader loading={isUpdating} loadingText="Updating...">
                Update File
              </ButtonLoader>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
