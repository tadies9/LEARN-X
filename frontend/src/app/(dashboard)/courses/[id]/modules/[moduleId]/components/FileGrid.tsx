'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
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
import { fileApi } from '@/lib/api/file';
import type { CourseFile } from '@/lib/types/course';
import {
  Download,
  Edit,
  Eye,
  FileText,
  MoreVertical,
  Trash,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileSpreadsheet,
  BookOpen,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { EditFileDialog } from './EditFileDialog';
import { useRouter } from 'next/navigation';

interface FileGridProps {
  files: CourseFile[];
  onUpdate: () => void;
}

export function FileGrid({ files, onUpdate }: FileGridProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [editingFile, setEditingFile] = useState<CourseFile | null>(null);

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

  const handleStudyMode = (file: CourseFile) => {
    // Navigate to study mode for this file
    // Get courseId from the URL params
    const pathSegments = window.location.pathname.split('/');
    const courseIdIndex = pathSegments.indexOf('courses') + 1;
    const courseId = pathSegments[courseIdIndex];
    router.push(`/courses/${courseId}/study/${file.id}`);
  };

  const getFileIcon = (mimeType: string) => {
    const iconClass = 'h-12 w-12';
    
    if (!mimeType) {
      return <FileText className={`${iconClass} text-gray-500`} />;
    }

    if (mimeType.includes('pdf')) {
      return <FileText className={`${iconClass} text-red-500`} />;
    } else if (mimeType.includes('image')) {
      return <FileImage className={`${iconClass} text-blue-500`} />;
    } else if (mimeType.includes('video')) {
      return <FileVideo className={`${iconClass} text-purple-500`} />;
    } else if (mimeType.includes('audio')) {
      return <FileAudio className={`${iconClass} text-green-500`} />;
    } else if (mimeType.includes('word') || mimeType.includes('doc')) {
      return <FileText className={`${iconClass} text-blue-600`} />;
    } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <FileSpreadsheet className={`${iconClass} text-green-600`} />;
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return <FileText className={`${iconClass} text-orange-500`} />;
    } else if (mimeType.includes('text') || mimeType.includes('plain')) {
      return <FileCode className={`${iconClass} text-gray-600`} />;
    }
    return <FileText className={`${iconClass} text-gray-500`} />;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getFileTypeLabel = (mimeType: string) => {
    if (!mimeType) return 'File';
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('image')) return 'Image';
    if (mimeType.includes('video')) return 'Video';
    if (mimeType.includes('audio')) return 'Audio';
    if (mimeType.includes('word')) return 'Word';
    if (mimeType.includes('excel')) return 'Excel';
    if (mimeType.includes('powerpoint')) return 'PowerPoint';
    if (mimeType.includes('text')) return 'Text';
    return 'File';
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {files.map((file) => (
          <Card
            key={file.id}
            className="group hover:shadow-lg transition-all duration-200 overflow-hidden"
          >
            <CardContent className="p-6">
              {/* File Icon and Type Badge */}
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-muted rounded-lg">{getFileIcon(file.mimeType)}</div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleStudyMode(file)}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Study Mode
                    </DropdownMenuItem>
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
                    <DropdownMenuItem
                      onClick={() => handleDelete(file)}
                      className="text-destructive"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* File Name and Description */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg line-clamp-2 min-h-[3.5rem]">{file.name}</h3>
                {file.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {file.description}
                  </p>
                )}
              </div>

              {/* File Metadata */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{getFileTypeLabel(file.mimeType)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Size</span>
                  <span className="font-medium">{formatFileSize(file.size)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={getStatusColor(file.status) as any} className="text-xs">
                    {file.status}
                  </Badge>
                </div>
              </div>
            </CardContent>

            <CardFooter className="px-6 py-3 bg-muted/50 border-t">
              <p className="text-xs text-muted-foreground">
                Uploaded{' '}
                {file.createdAt
                  ? formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })
                  : 'recently'}
              </p>
            </CardFooter>
          </Card>
        ))}
      </div>

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
    </>
  );
}
