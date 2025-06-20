'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/PageLoader';
import { CourseWorkspace } from '@/components/course/CourseWorkspace';
import { courseApi } from '@/lib/api/course';
import { moduleApi } from '@/lib/api/module';
import type { Course, Module } from '@/lib/types/course';

/**
 * Course Workspace Page
 * Streamlined single-screen interface for course content and personalization
 * Follows coding standards: < 100 lines
 */
export default function CourseWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const selectedFileId = searchParams.get('selectedFile');

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    setLoading(true);
    try {
      // Load course and modules first
      const [courseData, modulesData] = await Promise.all([
        courseApi.getCourse(courseId),
        moduleApi.getModules(courseId),
      ]);

      setCourse(courseData);

      // Process modules data like the regular course page does
      let processedModules: Module[] = [];
      if (Array.isArray(modulesData)) {
        processedModules = modulesData;
      } else if (modulesData && 'data' in modulesData && Array.isArray(modulesData.data)) {
        processedModules = modulesData.data;
      } else if (
        modulesData &&
        'modules' in modulesData &&
        Array.isArray((modulesData as { modules: Module[] }).modules)
      ) {
        processedModules = (modulesData as { modules: Module[] }).modules;
      }

      setModules(processedModules);

      // Load files for all modules
      const modulesWithFiles = await Promise.all(
        processedModules.map(async (module) => {
          try {
            console.log(`Loading files for module ${module.id}...`);
            const files = await moduleApi.getModuleFiles(module.id);
            console.log(`Module ${module.id} files:`, files);
            return { ...module, files };
          } catch (err) {
            console.log(`Could not load files for module ${module.id}:`, err);
            return { ...module, files: [] };
          }
        })
      );

      console.log('All modules with files:', modulesWithFiles);
      setModules(modulesWithFiles);
    } catch (error) {
      console.error('Failed to load course data:', error);
      router.push('/courses');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !course) {
    return <PageLoader message="Loading workspace..." />;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="container flex items-center gap-4 py-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/courses')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push(`/courses/${courseId}/edit`)}>
              Edit Course
            </Button>
          </div>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex-1 overflow-hidden">
        <CourseWorkspace
          courseId={courseId}
          modules={modules}
          selectedFileId={selectedFileId}
          onFileAction={(fileId, action) => {
            console.log('File action:', fileId, action);
          }}
          onModulesChanged={loadCourseData}
        />
      </div>
    </div>
  );
}
