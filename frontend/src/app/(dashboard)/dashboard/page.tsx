'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { StatsCard } from '@/components/dashboard/stats-card';
import { MiniChart } from '@/components/dashboard/mini-chart';
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';
import { CourseProgressCard } from '@/components/dashboard/course-progress-card';
import { FadeIn } from '@/components/animations/fade-in';
import { BookOpen, Clock, Trophy, TrendingUp, Brain, Target } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div>Loading...</div>;
  }

  // Mock data for demonstration
  const stats = [
    {
      title: 'Active Courses',
      value: 4,
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
            { value: 4 },
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
      title: 'Achievements',
      value: 12,
      icon: Trophy,
      iconColor: 'text-warning',
      description: '3 new this week',
    },
    {
      title: 'Learning Streak',
      value: '7 days',
      change: { value: 100, type: 'increase' as const },
      icon: TrendingUp,
      iconColor: 'text-success',
    },
  ];

  const activities = [
    {
      id: '1',
      type: 'complete' as const,
      title: 'Completed Module 3',
      description: 'Introduction to React Hooks',
      time: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: '2',
      type: 'achievement' as const,
      title: 'Achievement Unlocked',
      description: '7-day learning streak!',
      time: new Date(Date.now() - 1000 * 60 * 60 * 2),
    },
    {
      id: '3',
      type: 'course' as const,
      title: 'Started New Course',
      description: 'Advanced TypeScript Patterns',
      time: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
    {
      id: '4',
      type: 'goal' as const,
      title: 'Weekly Goal Achieved',
      description: 'Completed 5 hours of study',
      time: new Date(Date.now() - 1000 * 60 * 60 * 48),
    },
  ];

  const courses = [
    {
      id: '1',
      title: 'Introduction to Machine Learning',
      description: 'Learn the fundamentals of ML with Python and scikit-learn',
      progress: 65,
      totalModules: 12,
      completedModules: 8,
      duration: '6 weeks',
      students: 1234,
      nextLesson: 'Neural Networks Basics',
    },
    {
      id: '2',
      title: 'Advanced React Development',
      description: 'Master React patterns, performance optimization, and testing',
      progress: 40,
      totalModules: 10,
      completedModules: 4,
      duration: '4 weeks',
      students: 892,
      nextLesson: 'Custom Hooks',
    },
    {
      id: '3',
      title: 'Data Structures & Algorithms',
      description: 'Essential CS concepts for technical interviews',
      progress: 25,
      totalModules: 15,
      completedModules: 4,
      duration: '8 weeks',
      students: 2341,
      nextLesson: 'Binary Trees',
    },
  ];

  return (
    <div className="container mx-auto p-6">
      {/* Welcome Section */}
      <FadeIn>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.email?.split('@')[0] || 'Learner'}! 👋
          </h1>
          <p className="text-muted-foreground">You're on a 7-day learning streak. Keep it up!</p>
        </div>
      </FadeIn>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat, index) => (
          <FadeIn key={stat.title} delay={index * 0.1}>
            <StatsCard {...stat} />
          </FadeIn>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Courses Section */}
        <div className="lg:col-span-2 space-y-6">
          <FadeIn delay={0.4}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Continue Learning</h2>
              <Button variant="ghost" size="sm">
                View All Courses
              </Button>
            </div>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-2">
            {courses.map((course, index) => (
              <FadeIn key={course.id} delay={0.5 + index * 0.1}>
                <CourseProgressCard course={course} />
              </FadeIn>
            ))}
          </div>

          {/* AI Recommendations */}
          <FadeIn delay={0.8}>
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">AI Recommendation</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Based on your progress in React, we recommend exploring "State Management with
                    Zustand" next. It aligns perfectly with your learning path.
                  </p>
                  <Button size="sm">
                    <Target className="h-4 w-4 mr-2" />
                    Start Recommended Course
                  </Button>
                </div>
              </div>
            </Card>
          </FadeIn>
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-1">
          <FadeIn delay={0.6}>
            <ActivityTimeline activities={activities} />
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
