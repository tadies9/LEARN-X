'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, FileText, Plus } from 'lucide-react';
import { courseApi } from '@/lib/api/course';
import { moduleApi } from '@/lib/api/module';
import { fileApi } from '@/lib/api/file';
import type { Course, Module, CourseFile } from '@/lib/types/course';
import { FileUploadDialog } from './components/FileUploadDialog';
import { FileList } from './components/FileList';
import { EmptyFiles } from './components/EmptyFiles';

export default function ModuleDetailPage({ params }: { params: { id: string; moduleId: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.id, params.moduleId]);

  const loadData = async () => {
    try {
      const [courseData, moduleData, filesData] = await Promise.all([
        courseApi.getCourse(params.id),
        moduleApi.getModule(params.moduleId),
        fileApi.getModuleFiles(params.moduleId),
      ]);

      setCourse(courseData);
      setModule(moduleData);
      setFiles(filesData);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load module data.',
        variant: 'destructive',
      });
      router.push(`/courses/${params.id}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileReorder = async (fileId: string, newPosition: number) => {
    const oldFiles = [...files];
    const draggedFile = files.find((f) => f.id === fileId);
    if (!draggedFile) return;

    const newFiles = files.filter((f) => f.id !== fileId);
    newFiles.splice(newPosition, 0, draggedFile);
    setFiles(newFiles);

    try {
      const fileIds = newFiles.map((f) => f.id);
      await fileApi.reorderFiles(params.moduleId, fileIds);
    } catch (error) {
      setFiles(oldFiles);
      toast({
        title: 'Error',
        description: 'Failed to reorder files.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-24 bg-muted rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!course || !module) return null;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Link
          href={`/courses/${params.id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {course.title}
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{module.title}</CardTitle>
              {module.description && <CardDescription>{module.description}</CardDescription>}
            </div>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Course Materials
          </CardTitle>
          <CardDescription>
            {files.length} {files.length === 1 ? 'file' : 'files'} in this module
          </CardDescription>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <EmptyFiles onUpload={() => setUploadDialogOpen(true)} />
          ) : (
            <FileList files={files} onUpdate={loadData} onReorder={handleFileReorder} />
          )}
        </CardContent>
      </Card>

      <FileUploadDialog
        moduleId={params.moduleId}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={loadData}
      />
    </div>
  );
}
