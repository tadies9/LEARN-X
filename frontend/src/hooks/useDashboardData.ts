/**
 * Dashboard Data Hook
 * Fetches real data from backend APIs for dashboard components
 */

'use client';

import { useState, useEffect } from 'react';
import { courseApi } from '@/lib/api/CourseApiService';
import { dashboardApi } from '@/lib/api/DashboardApiService';
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

      // Fetch dashboard stats from the new API
      const apiStats = await dashboardApi.getDashboardStats();

      // Fetch recent courses
      const allCoursesResponse = await courseApi.getCourses({
        page: 1,
        limit: 10,
      });

      let courses: Course[] = [];

      // Handle different response formats safely
      if (Array.isArray(allCoursesResponse)) {
        courses = allCoursesResponse;
      } else if (allCoursesResponse && typeof allCoursesResponse === 'object') {
        // Handle BaseApiService PaginatedResponse format
        if ('data' in allCoursesResponse && Array.isArray((allCoursesResponse as { data: Course[] }).data)) {
          courses = (allCoursesResponse as { data: Course[] }).data;
        }
        // Handle other potential formats
        else if (
          'items' in allCoursesResponse &&
          Array.isArray((allCoursesResponse as { items: Course[] }).items)
        ) {
          courses = (allCoursesResponse as { items: Course[] }).items;
        }
        // Handle nested data structure
        else if (
          'data' in allCoursesResponse &&
          typeof (allCoursesResponse as unknown as { data: { items: Course[] } }).data === 'object' &&
          (allCoursesResponse as unknown as { data: { items: Course[] } }).data &&
          'items' in (allCoursesResponse as unknown as { data: { items: Course[] } }).data &&
          Array.isArray((allCoursesResponse as unknown as { data: { items: Course[] } }).data.items)
        ) {
          courses = (allCoursesResponse as unknown as { data: { items: Course[] } }).data.items;
        }
      }

      // Ensure courses is always an array
      if (!Array.isArray(courses)) {
        console.warn('Unexpected courses response format:', allCoursesResponse);
        courses = [];
      }

      // Transform API stats to match the dashboard format
      const dashboardStats: DashboardStats = {
        activeCourses: apiStats.courses.active,
        totalCourses:
          apiStats.courses.active + apiStats.courses.completed + apiStats.courses.archived,
        completedCourses: apiStats.courses.completed,
        archivedCourses: apiStats.courses.archived,
        totalStudyTime: apiStats.studyTime.total,
        weeklyStudyTime: apiStats.studyTime.thisWeek,
        learningStreak: apiStats.streak.current,
        lastActiveDate: apiStats.streak.lastActiveDate || new Date().toISOString(),
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
