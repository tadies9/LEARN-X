'use client';

import { useState, useEffect } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { moduleApi } from '@/lib/api/ModuleApiService';
import type { Module, UpdateModuleInput } from '@/lib/types/course';

interface EditModuleDialogProps {
  module: Module | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModuleUpdated: () => void;
}

export function EditModuleDialog({
  module,
  open,
  onOpenChange,
  onModuleUpdated,
}: EditModuleDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    estimatedDuration: '',
  });

  useEffect(() => {
    if (module) {
      setFormData({
        title: module.title || '',
        description: module.description || '',
        estimatedDuration: module.estimatedDuration?.toString() || '',
      });
    }
  }, [module]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!module) return;

    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'Module title is required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const updateData: UpdateModuleInput = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        estimatedDuration: formData.estimatedDuration
          ? parseInt(formData.estimatedDuration)
          : undefined,
      };

      await moduleApi.updateModule(module.id, updateData);

      toast({
        title: 'Success',
        description: 'Module updated successfully',
      });

      onOpenChange(false);
      onModuleUpdated();
    } catch (error) {
      console.error('Failed to update module:', error);
      toast({
        title: 'Error',
        description: 'Failed to update module. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Module</DialogTitle>
          <DialogDescription>Update the module details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Module Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Introduction to Machine Learning"
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of what this module covers..."
                rows={3}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duration">Estimated Duration (Minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="480"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                placeholder="e.g., 60"
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Module
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
