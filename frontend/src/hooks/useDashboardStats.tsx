import { useMemo } from 'react';

import { BookOpen, Clock, Trophy, TrendingUp } from 'lucide-react';

import { MiniChart } from '@/components/dashboard/MiniChart';

import type { DashboardStats } from '@/lib/types/dashboard';

interface UseDashboardStatsProps {
  stats: DashboardStats | null;
}

export function useDashboardStats({ stats }: UseDashboardStatsProps) {
  const statsData = useMemo(() => {
    const formatStudyTime = (hours: number): string => {
      if (hours < 1) {
        return `${Math.round(hours * 60)}m`;
      }
      if (hours >= 100) {
        return `${Math.round(hours)}h`;
      }
      return `${hours.toFixed(1)}h`;
    };

    const formatStreak = (days: number): string => {
      if (days === 0) return 'Start today!';
      if (days === 1) return '1 day';
      return `${days} days`;
    };

    // Calculate week-over-week changes (mock for now, will be real when we track history)
    const weeklyStudyChange = stats?.weeklyStudyTime && stats.weeklyStudyTime > 0 ? 15 : 0;
    const streakChange = stats?.learningStreak && stats.learningStreak > 0 ? 100 : 0;

    return [
      {
        title: 'Active Courses',
        value: stats?.activeCourses ?? 0,
        change: stats?.activeCourses ? { value: 12, type: 'increase' as const } : undefined,
        icon: BookOpen,
        iconColor: 'text-primary',
        chart: (
          <MiniChart
            data={[
              { value: Math.max(0, (stats?.activeCourses ?? 0) - 3) },
              { value: Math.max(0, (stats?.activeCourses ?? 0) - 2) },
              { value: Math.max(0, (stats?.activeCourses ?? 0) - 3) },
              { value: Math.max(0, (stats?.activeCourses ?? 0) - 1) },
              { value: Math.max(0, (stats?.activeCourses ?? 0) - 2) },
              { value: Math.max(0, (stats?.activeCourses ?? 0) - 1) },
              { value: stats?.activeCourses ?? 0 },
            ]}
          />
        ),
      },
      {
        title: 'Study Time',
        value: formatStudyTime(stats?.weeklyStudyTime ?? 0),
        change: weeklyStudyChange > 0 ? { value: weeklyStudyChange, type: 'increase' as const } : undefined,
        icon: Clock,
        iconColor: 'text-info',
        description: 'This week',
        chart: (
          <MiniChart
            data={[
              { value: Math.max(0, (stats?.weeklyStudyTime ?? 0) * 0.6) },
              { value: Math.max(0, (stats?.weeklyStudyTime ?? 0) * 0.8) },
              { value: Math.max(0, (stats?.weeklyStudyTime ?? 0) * 1.0) },
              { value: Math.max(0, (stats?.weeklyStudyTime ?? 0) * 0.7) },
              { value: Math.max(0, (stats?.weeklyStudyTime ?? 0) * 1.2) },
              { value: Math.max(0, (stats?.weeklyStudyTime ?? 0) * 0.9) },
              { value: stats?.weeklyStudyTime ?? 0 },
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
        description: stats?.archivedCourses ? `${stats.archivedCourses} archived` : 'All active',
      },
      {
        title: 'Learning Streak',
        value: formatStreak(stats?.learningStreak ?? 0),
        change: streakChange > 0 ? { value: streakChange, type: 'increase' as const } : undefined,
        icon: TrendingUp,
        iconColor: 'text-success',
      },
    ];
  }, [stats]);

  return statsData;
}