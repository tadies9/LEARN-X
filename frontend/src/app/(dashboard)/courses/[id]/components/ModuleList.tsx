'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { useToast } from '@/components/ui/use-toast';
import { moduleApi } from '@/lib/api/module';
import type { Module } from '@/lib/types/course';
import {
  Clock,
  Edit,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  MoreVertical,
  Trash,
} from 'lucide-react';
import { EditModuleDialog } from './EditModuleDialog';
import Link from 'next/link';

interface ModuleListProps {
  modules?: Module[];
  onUpdate: () => void;
  onReorder: (moduleId: string, newPosition: number) => void;
}

export function ModuleList({ modules = [], onUpdate, onReorder }: ModuleListProps) {
  const { toast } = useToast();
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [draggedModule, setDraggedModule] = useState<Module | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handlePublishToggle = async (module: Module) => {
    try {
      if (module.isPublished) {
        await moduleApi.unpublishModule(module.id);
        toast({
          title: 'Module unpublished',
          description: 'The module is now hidden from students.',
        });
      } else {
        await moduleApi.publishModule(module.id);
        toast({
          title: 'Module published',
          description: 'The module is now visible to students.',
        });
      }
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${module.isPublished ? 'unpublish' : 'publish'} module.`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (module: Module) => {
    if (
      !confirm(
        'Are you sure you want to delete this module? This will also delete all files in this module.'
      )
    ) {
      return;
    }

    try {
      await moduleApi.deleteModule(module.id);
      toast({
        title: 'Module deleted',
        description: 'The module has been permanently deleted.',
      });
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete module.',
        variant: 'destructive',
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, module: Module) => {
    setDraggedModule(module);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedModule) return;

    const draggedIndex = modules.findIndex((m) => m.id === draggedModule.id);
    if (draggedIndex === dropIndex) return;

    // Calculate new position (1-based)
    const newPosition = dropIndex + 1;

    await onReorder(draggedModule.id, newPosition);
    setDraggedModule(null);
  };

  if (!modules || modules.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No modules yet. Create your first module to get started.</p>
      </div>
    );
  }

  // Ensure modules is an array before mapping
  const safeModules = Array.isArray(modules) ? modules : [];

  return (
    <div className="space-y-3">
      {safeModules.map((module, index) => (
        <Card
          key={module.id}
          className={`transition-all ${dragOverIndex === index ? 'border-primary shadow-lg' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, module)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
        >
          <div className="p-4 flex items-center gap-4">
            <div className="cursor-move text-muted-foreground hover:text-foreground">
              <GripVertical className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/courses/${module.courseId}/modules/${module.id}`}
                  className="font-semibold hover:underline"
                >
                  {module.title}
                </Link>
                {!module.isPublished && <Badge variant="secondary">Draft</Badge>}
              </div>
              {module.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{module.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span>{module.fileCount || 0} files</span>
                </div>
                {module.estimatedDuration && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{module.estimatedDuration} min</span>
                  </div>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/courses/${module.courseId}/modules/${module.id}`}>
                    <FileText className="mr-2 h-4 w-4" />
                    Manage Files
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingModule(module)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePublishToggle(module)}>
                  {module.isPublished ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Unpublish
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Publish
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDelete(module)} className="text-destructive">
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      ))}

      {editingModule && (
        <EditModuleDialog
          module={editingModule}
          open={true}
          onOpenChange={(open) => !open && setEditingModule(null)}
          onSuccess={() => {
            setEditingModule(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
