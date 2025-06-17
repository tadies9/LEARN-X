'use client';

// 1. React/Next imports
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Internal imports - absolute paths (@/)
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { DashboardWelcome } from '@/components/dashboard/DashboardWelcome';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { CoursesSection } from '@/components/dashboard/CoursesSection';
import { AIRecommendation } from '@/components/dashboard/AIRecommendation';
import { NewUserDashboard } from '@/components/dashboard/NewUserDashboard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { FadeIn } from '@/components/animations/FadeIn';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { usePersonalizedGreeting } from '@/hooks/usePersona';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/DashboardApiService';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { stats, recentCourses, loading: dashboardLoading, error, refetch } = useDashboardData();
  const statsData = useDashboardStats({ stats });

  // Move this hook call before any conditional returns to comply with Rules of Hooks
  const userName = user?.email?.split('@')[0] || 'Learner';
  const personalizedGreeting = usePersonalizedGreeting(userName);

  // Fetch real activity data
  const { data: activities } = useQuery({
    queryKey: ['user-activities'],
    queryFn: () => dashboardApi.getActivity(10),
    enabled: !!user,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return <div>Loading...</div>;
  }

  // Check if user is new (no courses yet)
  const isNewUser = stats?.totalCourses === 0;

  // Show new user dashboard if no courses
  if (isNewUser && !dashboardLoading) {
    return (
      <div className="container mx-auto p-6">
        <NewUserDashboard />
      </div>
    );
  }

  // Show regular dashboard for users with courses
  return (
    <div className="container mx-auto p-6">
      <DashboardWelcome greeting={personalizedGreeting} />

      <DashboardStats
        statsData={statsData}
        loading={dashboardLoading}
        error={error}
        onRetry={refetch}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-1 lg:col-span-2 space-y-6">
          <CoursesSection courses={recentCourses} />
          
          <FadeIn delay={0.4}>
            <QuickActions />
          </FadeIn>
        </div>

        <div className="md:col-span-1 space-y-6">
          <AIRecommendation />

          <FadeIn delay={0.6}>
            <ActivityTimeline activities={activities || []} />
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
