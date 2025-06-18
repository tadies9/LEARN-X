'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { ArrowLeft, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/PageLoader';
import { courseApi } from '@/lib/api/course';
import { moduleApi } from '@/lib/api/module';

import { CollapsibleModuleList } from './components/CollapsibleModuleList';
import { CourseHeader } from './components/CourseHeader';
import { CreateModuleDialog } from './components/CreateModuleDialog';
import { EmptyModules } from './components/EmptyModules';

import type { Course, Module } from '@/lib/types/course';

interface CourseStats {
  totalEnrollments?: number;
  completionRate?: number;
  averageRating?: number;
}

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [stats, setStats] = useState<CourseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    setLoading(true);
    try {
      const [courseData, modulesData, statsData] = await Promise.all([
        courseApi.getCourse(courseId),
        moduleApi.getModules(courseId),
        courseApi.getCourseStats(courseId).catch(() => null), // Don't fail if stats aren't available
      ]);

      setCourse(courseData);
      // Ensure modulesData is always an array, handling various API response formats
      let processedModules = [];
      if (Array.isArray(modulesData)) {
        processedModules = modulesData;
      } else if (modulesData && Array.isArray(modulesData.data)) {
        processedModules = modulesData.data;
      } else if (modulesData && Array.isArray((modulesData as any).modules)) {
        processedModules = (modulesData as any).modules;
      }
      setModules(processedModules);
      setStats(statsData as CourseStats | null);
    } catch (error) {
      console.error('Error loading course:', error);
      router.push('/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleModuleCreated = async () => {
    await loadCourseData();
    setCreateDialogOpen(false);
  };

  const handleModuleUpdate = async () => {
    await loadCourseData();
  };

  const handleModuleReorder = async (moduleId: string, newPosition: number) => {
    try {
      await moduleApi.reorderModules(moduleId, newPosition);
      await loadCourseData();
    } catch (error) {
      console.error('Error reordering modules:', error);
    }
  };

  if (loading || !course) {
    return <PageLoader message="Loading course..." />;
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <CourseHeader course={course} onUpdate={loadCourseData} />

      {/* Course Statistics */}
      {stats && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-medium mb-2">Total Enrollments</h3>
            <p className="text-3xl font-bold text-primary">{stats.totalEnrollments || 0}</p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-medium mb-2">Completion Rate</h3>
            <p className="text-3xl font-bold text-green-600">{stats.completionRate || 0}%</p>
          </div>
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-medium mb-2">Average Rating</h3>
            <p className="text-3xl font-bold text-yellow-600">{stats.averageRating || 0}/5</p>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold">Course Modules</h2>
            <p className="text-muted-foreground mt-1">Organize your course content into modules</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Module
          </Button>
        </div>

        {modules.length === 0 ? (
          <EmptyModules onCreateModule={() => setCreateDialogOpen(true)} />
        ) : (
          <CollapsibleModuleList
            modules={modules}
            onUpdate={handleModuleUpdate}
            onReorder={handleModuleReorder}
          />
        )}
      </div>

      <CreateModuleDialog
        courseId={courseId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleModuleCreated}
      />
    </div>
  );
}
