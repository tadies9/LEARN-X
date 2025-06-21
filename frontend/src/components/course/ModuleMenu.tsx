'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
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
import { Button } from '@/components/ui/Button';
import { MoreHorizontal, Edit, Trash2, MoveUp, MoveDown } from 'lucide-react';
import { useToast } from '@/components/ui/useToast';
import { moduleApi } from '@/lib/api/ModuleApiService';
import type { Module } from '@/lib/types/course';

interface ModuleMenuProps {
  module: Module;
  moduleIndex: number;
  totalModules: number;
  onEdit: (module: Module) => void;
  onDeleted: () => void;
  onReordered: () => void;
}

export function ModuleMenu({
  module,
  moduleIndex,
  totalModules,
  onEdit,
  onDeleted,
  onReordered,
}: ModuleMenuProps) {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      console.log('Attempting to delete module:', module.id);

      // Try to delete the module
      try {
        await moduleApi.deleteModule(module.id);
      } catch (error: any) {
        // If we get a 401, try to refresh the session and retry once
        if (error.response?.status === 401) {
          console.log('Got 401, attempting to refresh session and retry...');
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();

          // Force refresh the session
          const {
            data: { session },
            error: refreshError,
          } = await supabase.auth.refreshSession();

          if (refreshError || !session) {
            throw new Error('Failed to refresh authentication session');
          }

          console.log('Session refreshed, retrying delete...');
          // Retry the delete operation
          await moduleApi.deleteModule(module.id);
        } else {
          throw error;
        }
      }

      toast({
        title: 'Success',
        description: 'Module deleted successfully',
      });

      onDeleted();
    } catch (error: any) {
      console.error('Failed to delete module:', {
        error,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        config: error.config,
        headers: error.config?.headers,
      });

      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete module. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleReorder = async (newPosition: number) => {
    try {
      await moduleApi.reorderModules(module.id, newPosition);

      toast({
        title: 'Success',
        description: 'Module reordered successfully',
      });

      onReordered();
    } catch (error) {
      console.error('Failed to reorder module:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder module. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(module)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Module
          </DropdownMenuItem>

          {totalModules > 1 && (
            <>
              <DropdownMenuSeparator />
              {moduleIndex > 0 && (
                <DropdownMenuItem onClick={() => handleReorder(moduleIndex)}>
                  <MoveUp className="mr-2 h-4 w-4" />
                  Move Up
                </DropdownMenuItem>
              )}
              {moduleIndex < totalModules - 1 && (
                <DropdownMenuItem onClick={() => handleReorder(moduleIndex + 2)}>
                  <MoveDown className="mr-2 h-4 w-4" />
                  Move Down
                </DropdownMenuItem>
              )}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Module
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the module "{module.title}" and all its files. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete Module'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
