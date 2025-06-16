/**
 * Dashboard Data Hook
 * Fetches real data from backend APIs for dashboard components
 */

'use client';

import { useState, useEffect } from 'react';
import { courseApi } from '@/lib/api/course';
import { notificationApi } from '@/lib/api/notification';
import type { Course } from '@/lib/types/course';
import type { DashboardStats } from '@/lib/types/dashboard';

interface DashboardData {
  stats: DashboardStats | null;
  recentCourses: Course[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDashboardData(): DashboardData {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCourses, setRecentCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all courses to calculate stats
      const allCoursesResponse = await courseApi.getCourses({
        page: 1,
        limit: 100, // Get enough to calculate stats
      });

      let courses: Course[] = [];

      // Handle different response formats safely
      if (Array.isArray(allCoursesResponse)) {
        courses = allCoursesResponse;
      } else if (allCoursesResponse && typeof allCoursesResponse === 'object') {
        // Handle BaseApiService PaginatedResponse format
        if ('data' in allCoursesResponse && Array.isArray((allCoursesResponse as any).data)) {
          courses = (allCoursesResponse as any).data;
        }
        // Handle other potential formats
        else if (
          'items' in allCoursesResponse &&
          Array.isArray((allCoursesResponse as any).items)
        ) {
          courses = (allCoursesResponse as any).items;
        }
        // Handle nested data structure
        else if (
          'data' in allCoursesResponse &&
          typeof (allCoursesResponse as any).data === 'object' &&
          (allCoursesResponse as any).data &&
          'items' in (allCoursesResponse as any).data &&
          Array.isArray((allCoursesResponse as any).data.items)
        ) {
          courses = (allCoursesResponse as any).data.items;
        }
      }

      // Ensure courses is always an array
      if (!Array.isArray(courses)) {
        console.warn('Unexpected courses response format:', allCoursesResponse);
        courses = [];
      }

      // Calculate statistics
      const dashboardStats: DashboardStats = {
        activeCourses: courses.filter((course: Course) => !course.isArchived).length,
        totalCourses: courses.length,
        completedCourses: 0, // TODO: Add completion tracking
        archivedCourses: courses.filter((course: Course) => course.isArchived).length,
        totalStudyTime: 0, // TODO: Add study time tracking
        weeklyStudyTime: 0, // TODO: Add weekly study time tracking
        learningStreak: 0, // TODO: Add learning streak tracking
        lastActiveDate: new Date().toISOString(), // TODO: Track actual last active date
      };

      // Get recent courses (non-archived, sorted by updated date)
      const recent = courses
        .filter((course: Course) => !course.isArchived)
        .sort(
          (a: Course, b: Course) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 3);

      setStats(dashboardStats);
      setRecentCourses(recent);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    stats,
    recentCourses,
    loading,
    error,
    refetch: fetchDashboardData,
  };
}
