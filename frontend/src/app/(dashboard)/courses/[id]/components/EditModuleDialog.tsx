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
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { ButtonLoader } from '@/components/ui/ButtonLoader';
import { useToast } from '@/components/ui/useToast';
import { updateModuleSchema, type UpdateModuleData } from '@/lib/validations/course';
import { moduleApi } from '@/lib/api/module';
import type { Module } from '@/lib/types/course';

interface EditModuleDialogProps {
  module: Module;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditModuleDialog({ module, open, onOpenChange, onSuccess }: EditModuleDialogProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateModuleData>({
    resolver: zodResolver(updateModuleSchema),
    defaultValues: {
      title: module.title,
      description: module.description || '',
      estimatedDuration: module.estimatedDuration,
    },
  });

  useEffect(() => {
    reset({
      title: module.title,
      description: module.description || '',
      estimatedDuration: module.estimatedDuration,
    });
  }, [module, reset]);

  const onSubmit = async (data: UpdateModuleData) => {
    setIsUpdating(true);
    try {
      await moduleApi.updateModule(module.id, data);

      toast({
        title: 'Module updated',
        description: 'Your module has been updated successfully.',
      });

      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update module. Please try again.',
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
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>Update module information</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Module Title *</Label>
              <Input id="title" {...register('title')} disabled={isUpdating} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                {...register('description')}
                disabled={isUpdating}
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
                {...register('estimatedDuration', { valueAsNumber: true })}
                disabled={isUpdating}
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
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              <ButtonLoader loading={isUpdating} loadingText="Updating...">
                Update Module
              </ButtonLoader>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
