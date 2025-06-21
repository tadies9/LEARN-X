import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/ui/useToast';
import { courseApi } from '@/lib/api/CourseApiService';
import { moduleApi } from '@/lib/api/ModuleApiService';
import { fileApi } from '@/lib/api/FileApiService';

import type { Course, Module, CourseFile } from '@/lib/types/course';

interface UseModuleDetailProps {
  courseId: string;
  moduleId: string;
}

export function useModuleDetail({ courseId, moduleId }: UseModuleDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [module, setModule] = useState<Module | null>(null);
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (): Promise<void> => {
    try {
      console.log('Loading module data for:', { courseId, moduleId });

      const [courseData, moduleData, filesData] = await Promise.all([
        courseApi.getCourse(courseId),
        moduleApi.getModule(moduleId),
        fileApi.getModuleFiles(moduleId),
      ]);

      console.log('Module data loaded:', {
        course: courseData,
        module: moduleData,
        filesCount: filesData.length,
        files: filesData,
      });

      setCourse(courseData);
      setModule(moduleData);
      setFiles(filesData);
    } catch (error) {
      console.error('Error loading module data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load module data.',
        variant: 'destructive',
      });
      router.push(`/courses/${courseId}/workspace`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileReorder = async (fileId: string, newPosition: number): Promise<void> => {
    const oldFiles = [...files];
    const draggedFile = files.find((f) => f.id === fileId);
    if (!draggedFile) return;

    const newFiles = files.filter((f) => f.id !== fileId);
    newFiles.splice(newPosition, 0, draggedFile);
    setFiles(newFiles);

    try {
      const fileIds = newFiles.map((f) => f.id);
      await fileApi.reorderFiles(moduleId, fileIds);
    } catch (error) {
      setFiles(oldFiles);
      toast({
        title: 'Error',
        description: 'Failed to reorder files.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadData();
  }, [courseId, moduleId]);

  return {
    course,
    module,
    files,
    loading,
    loadData,
    handleFileReorder,
  };
}
