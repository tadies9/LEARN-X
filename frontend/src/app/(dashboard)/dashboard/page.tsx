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
import { FadeIn } from '@/components/animations/FadeIn';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { MOCK_ACTIVITIES } from '@/data/mockActivities';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { stats, recentCourses, loading: dashboardLoading, error, refetch } = useDashboardData();
  const statsData = useDashboardStats({ stats });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return <div>Loading...</div>;
  }

  const userName = user?.email?.split('@')[0] || 'Learner';

  return (
    <div className="container mx-auto p-6">
      <DashboardWelcome userName={userName} />
      
      <DashboardStats
        statsData={statsData}
        loading={dashboardLoading}
        error={error}
        onRetry={refetch}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <div className="md:col-span-1">
          <CoursesSection courses={recentCourses} />
        </div>
        
        <div className="md:col-span-1 space-y-6">
          <AIRecommendation />
          
          <FadeIn delay={0.6}>
            <ActivityTimeline activities={MOCK_ACTIVITIES} />
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
