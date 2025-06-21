'use client';

// 1. React/Next imports
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Lock } from 'lucide-react';

// Type for ActivityTimeline iconMap
const iconMap = {
  course: 'BookOpen',
  achievement: 'Trophy',
  goal: 'Target',
  comment: 'MessageSquare',
  assignment: 'FileText',
  complete: 'CheckCircle',
} as const;

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { stats, recentCourses, loading: dashboardLoading, error, refetch } = useDashboardData();
  const statsData = useDashboardStats({ stats });
  const [showLockedAlert, setShowLockedAlert] = useState(false);

  // Move this hook call before any conditional returns to comply with Rules of Hooks
  const userName = user?.email?.split('@')[0] || 'Learner';
  const personalizedGreeting = usePersonalizedGreeting(userName);

  // Fetch real activity data
  const { data: userActivities } = useQuery({
    queryKey: ['user-activities'],
    queryFn: () => dashboardApi.getActivity(10),
    enabled: !!user,
  });

  // Transform UserActivity to Activity format
  const activities = userActivities?.map((activity) => {
    const activityInfo = dashboardApi.getActivityTypeInfo(activity.type);
    const typeMap: Record<string, keyof typeof iconMap> = {
      course_created: 'course',
      module_completed: 'complete',
      file_uploaded: 'assignment',
      study_session: 'course',
      achievement_earned: 'achievement',
      quiz_completed: 'complete',
      flashcard_practiced: 'course',
    };
    
    return {
      id: activity.id,
      type: typeMap[activity.type] || 'course',
      title: activityInfo.label,
      description: activity.metadata?.description as string || '',
      time: new Date(activity.timestamp),
      user: user ? {
        name: user.email?.split('@')[0] || 'User',
        avatar: user.user_metadata?.avatar_url,
      } : undefined,
    };
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }

    // Check if redirected from a locked page
    if (searchParams.get('locked') === 'true') {
      setShowLockedAlert(true);
      // Remove the query parameter after showing the alert
      const url = new URL(window.location.href);
      url.searchParams.delete('locked');
      router.replace(url.pathname);

      // Auto-hide alert after 5 seconds
      setTimeout(() => setShowLockedAlert(false), 5000);
    }
  }, [user, authLoading, router, searchParams]);

  if (authLoading || !user) {
    return <div>Loading...</div>;
  }

  // Show loading state while dashboard data is loading
  if (dashboardLoading) {
    return <div>Loading dashboard...</div>;
  }

  // Check if user is new (no courses yet)
  // Data has already loaded at this point, so check both stats and actual courses
  const isNewUser = (stats?.totalCourses === 0 || !stats) && recentCourses.length === 0;

  // Show new user dashboard if no courses
  if (isNewUser) {
    return (
      <div className="container mx-auto p-6">
        <NewUserDashboard />
      </div>
    );
  }

  // Show regular dashboard for users with courses
  return (
    <div className="container mx-auto p-6">
      {showLockedAlert && (
        <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
          <Lock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertTitle className="text-orange-800 dark:text-orange-200">Page Locked</AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            This feature is currently locked. Please explore the Dashboard and My Courses sections.
          </AlertDescription>
        </Alert>
      )}

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
