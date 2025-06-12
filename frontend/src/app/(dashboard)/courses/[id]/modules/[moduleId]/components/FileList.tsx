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
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { fileApi } from '@/lib/api/file';
import type { CourseFile } from '@/lib/types/course';
import { Download, Edit, Eye, FileText, GripVertical, MoreVertical, Trash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { EditFileDialog } from './EditFileDialog';

interface FileListProps {
  files: CourseFile[];
  onUpdate: () => void;
  onReorder: (fileId: string, newPosition: number) => void;
}

export function FileList({ files, onUpdate, onReorder }: FileListProps) {
  const { toast } = useToast();
  const [editingFile, setEditingFile] = useState<CourseFile | null>(null);
  const [draggedFile, setDraggedFile] = useState<CourseFile | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDelete = async (file: CourseFile) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await fileApi.deleteFile(file.id);
      toast({
        title: 'File deleted',
        description: 'The file has been permanently deleted.',
      });
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete file.',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (file: CourseFile) => {
    try {
      const url = await fileApi.getSignedUrl(file.id);
      window.open(url, '_blank');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download file.',
        variant: 'destructive',
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, file: CourseFile) => {
    setDraggedFile(file);
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

    if (!draggedFile) return;

    const draggedIndex = files.findIndex((f) => f.id === draggedFile.id);
    if (draggedIndex === dropIndex) return;

    await onReorder(draggedFile.id, dropIndex);
    setDraggedFile(null);
  };

  const getFileIcon = (mimeType: string) => {
    // You could expand this to show different icons for different file types
    return <FileText className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-3">
      {files.map((file, index) => (
        <Card
          key={file.id}
          className={`transition-all ${dragOverIndex === index ? 'border-primary shadow-lg' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, file)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
        >
          <div className="p-4 flex items-center gap-4">
            <div className="cursor-move text-muted-foreground hover:text-foreground">
              <GripVertical className="h-5 w-5" />
            </div>

            <div className="flex-shrink-0 text-muted-foreground">{getFileIcon(file.mimeType)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium truncate">{file.name}</h4>
                <Badge variant="secondary" className="text-xs">
                  {file.status}
                </Badge>
              </div>
              {file.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">{file.description}</p>
              )}
              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span>{formatFileSize(file.size)}</span>
                <span>
                  Uploaded {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload(file)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`/files/${file.id}/preview`} target="_blank">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingFile(file)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDelete(file)} className="text-destructive">
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      ))}

      {editingFile && (
        <EditFileDialog
          file={editingFile}
          open={true}
          onOpenChange={(open) => !open && setEditingFile(null)}
          onSuccess={() => {
            setEditingFile(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
