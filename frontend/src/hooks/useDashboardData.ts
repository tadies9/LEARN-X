/**
 * Dashboard Data Hook
 * Fetches real data from backend APIs for dashboard components
 */

'use client';

import { useState, useEffect } from 'react';
import { courseApi } from '@/lib/api/course';
import { notificationApi } from '@/lib/api/notification';
import type { Course } from '@/lib/types/course';

interface DashboardStats {
  activeCourses: number;
  totalCourses: number;
  completedCourses: number;
  archivedCourses: number;
}

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

      const courses = allCoursesResponse.data;

      // Calculate statistics
      const dashboardStats: DashboardStats = {
        activeCourses: courses.filter(course => !course.isArchived).length,
        totalCourses: courses.length,
        completedCourses: 0, // TODO: Add completion tracking
        archivedCourses: courses.filter(course => course.isArchived).length,
      };

      // Get recent courses (non-archived, sorted by updated date)
      const recent = courses
        .filter(course => !course.isArchived)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
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