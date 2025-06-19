/**
 * Study Materials Hook
 * Fetches course files and transforms them into study materials
 */

'use client';

import { useState, useEffect } from 'react';
import { courseApi } from '@/lib/api/course';
import { moduleApi } from '@/lib/api/module';
import { fileApi } from '@/lib/api/file';
import type { Course, Module, CourseFile } from '@/lib/types/course';

interface StudyMaterial {
  id: string;
  title: string;
  originalSource: string;
  type: string;
  personalizedFor: string;
  estimatedTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  progress: number;
  lastStudied: string | null;
  aiFeatures: string[];
  status: 'ready' | 'in-progress' | 'completed';
  courseTitle: string;
  moduleTitle: string;
}

interface UseStudyMaterialsReturn {
  materials: StudyMaterial[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStudyMaterials(): UseStudyMaterialsReturn {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudyMaterials = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all courses
      const coursesResponse = await courseApi.getCourses({
        page: 1,
        limit: 50,
        isArchived: false,
      });

      const allMaterials: StudyMaterial[] = [];

      // Handle both paginated and array responses
      const courses = Array.isArray(coursesResponse) ? coursesResponse : coursesResponse.data;

      // For each course, get modules and files
      for (const course of courses) {
        try {
          const modulesResponse = await moduleApi.getModules(course.id);
          const modules = Array.isArray(modulesResponse) ? modulesResponse : modulesResponse.data;

          for (const module of modules) {
            try {
              const files = await moduleApi.getModuleFiles(module.id);

              // Transform files into study materials
              const moduleMaterials = files.map((file: CourseFile) => ({
                id: file.id,
                title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension
                originalSource: file.name,
                type: getFileType(file.mimeType),
                personalizedFor: 'AI Personalized', // TODO: Get from user persona
                estimatedTime: estimateReadingTime(file.size),
                difficulty: 'Beginner' as const, // TODO: Analyze content difficulty
                progress: 0, // TODO: Add progress tracking
                lastStudied: null, // TODO: Add study session tracking
                aiFeatures: getAiFeatures(file.mimeType),
                status: file.status === 'completed' ? ('ready' as const) : ('in-progress' as const),
                courseTitle: course.title,
                moduleTitle: module.title,
              }));

              allMaterials.push(...moduleMaterials);
            } catch (moduleError) {
              console.error(`Error loading files for module ${module.id}:`, moduleError);
            }
          }
        } catch (courseError) {
          console.error(`Error loading modules for course ${course.id}:`, courseError);
        }
      }

      setMaterials(allMaterials);
    } catch (err) {
      console.error('Error fetching study materials:', err);
      setError(err instanceof Error ? err.message : 'Failed to load study materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudyMaterials();
  }, []);

  return {
    materials,
    loading,
    error,
    refetch: fetchStudyMaterials,
  };
}

function getFileType(mimeType: string): string {
  if (!mimeType) return 'Document';
  if (mimeType.includes('pdf')) return 'PDF Document';
  if (mimeType.includes('presentation')) return 'Presentation';
  if (mimeType.includes('document')) return 'Document';
  if (mimeType.includes('text')) return 'Text File';
  return 'Document';
}

function estimateReadingTime(fileSize: number): string {
  // Rough estimation: 1KB ≈ 1 minute of reading
  const minutes = Math.max(5, Math.round(fileSize / 1024));
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  return `${minutes} min`;
}

function getAiFeatures(mimeType: string): string[] {
  const baseFeatures = ['AI Summarization', 'Key Points Extraction'];
  
  if (!mimeType) return baseFeatures;

  if (mimeType.includes('pdf')) {
    return [...baseFeatures, 'Visual Diagrams', 'Interactive Reading'];
  }
  if (mimeType.includes('presentation')) {
    return [...baseFeatures, 'Slide Analysis', 'Speaker Notes'];
  }
  if (mimeType.includes('document')) {
    return [...baseFeatures, 'Document Structure', 'Citations'];
  }

  return baseFeatures;
}
