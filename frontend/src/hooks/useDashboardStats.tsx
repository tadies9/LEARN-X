import { useMemo } from 'react';

import { BookOpen, Clock, Trophy, TrendingUp } from 'lucide-react';

import { MiniChart } from '@/components/dashboard/MiniChart';

import type { DashboardStats } from '@/lib/types/dashboard';

interface UseDashboardStatsProps {
  stats: DashboardStats | null;
}

export function useDashboardStats({ stats }: UseDashboardStatsProps) {
  const statsData = useMemo(() => [
    {
      title: 'Active Courses',
      value: stats?.activeCourses ?? 0,
      change: { value: 12, type: 'increase' as const },
      icon: BookOpen,
      iconColor: 'text-primary',
      chart: (
        <MiniChart
          data={[
            { value: 3 },
            { value: 4 },
            { value: 3 },
            { value: 5 },
            { value: 4 },
            { value: 6 },
            { value: stats?.activeCourses ?? 4 },
          ]}
        />
      ),
    },
    {
      title: 'Study Time',
      value: '24.5h',
      change: { value: 8, type: 'increase' as const },
      icon: Clock,
      iconColor: 'text-info',
      description: 'This week',
      chart: (
        <MiniChart
          data={[
            { value: 2 },
            { value: 3 },
            { value: 4 },
            { value: 3 },
            { value: 5 },
            { value: 4 },
            { value: 3 },
          ]}
          color="#0EA5E9"
        />
      ),
    },
    {
      title: 'Total Courses',
      value: stats?.totalCourses ?? 0,
      icon: Trophy,
      iconColor: 'text-warning',
      description: `${stats?.archivedCourses ?? 0} archived`,
    },
    {
      title: 'Learning Streak',
      value: '7 days',
      change: { value: 100, type: 'increase' as const },
      icon: TrendingUp,
      iconColor: 'text-success',
    },
  ], [stats]);

  return statsData;
}