'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { ButtonLoader } from '@/components/ui/ButtonLoader';
import { useToast } from '@/components/ui/useToast';
import { createModuleSchema, type CreateModuleData } from '@/lib/validations/course';
import { moduleApi } from '@/lib/api/ModuleApiService';

interface CreateModuleDialogProps {
  courseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateModuleDialog({
  courseId,
  open,
  onOpenChange,
  onSuccess,
}: CreateModuleDialogProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateModuleData>({
    resolver: zodResolver(createModuleSchema),
    defaultValues: {
      courseId,
    },
  });

  const onSubmit = async (data: CreateModuleData) => {
    setIsCreating(true);
    try {
      await moduleApi.createModule(data);

      toast({
        title: 'Module created',
        description: 'Your module has been created successfully.',
      });

      reset();
      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create module. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create New Module</DialogTitle>
            <DialogDescription>Add a new module to organize your course content</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Module Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Introduction to Python"
                {...register('title')}
                disabled={isCreating}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What will students learn in this module?"
                rows={3}
                {...register('description')}
                disabled={isCreating}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="estimatedDuration">Estimated Duration (minutes)</Label>
              <Input
                id="estimatedDuration"
                type="number"
                placeholder="e.g., 30"
                {...register('estimatedDuration', { valueAsNumber: true })}
                disabled={isCreating}
              />
              {errors.estimatedDuration && (
                <p className="text-sm text-destructive">{errors.estimatedDuration.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              <ButtonLoader loading={isCreating} loadingText="Creating...">
                Create Module
              </ButtonLoader>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
