'use client';

import { Target, Trophy, Flame, Star, TrendingUp, BookOpen, Clock, Calendar } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ProgressPage() {
  // Mock data for progress tracking
  const overallStats = {
    level: 12,
    xp: 2850,
    xpToNext: 3000,
    streak: 7,
    totalCourses: 8,
    completedCourses: 3,
    totalHours: 45.5,
    achievements: 12,
  };

  const courseProgress = [
    {
      id: 1,
      title: 'JavaScript Fundamentals',
      progress: 85,
      xpEarned: 850,
      timeSpent: '12.5h',
      modules: { completed: 8, total: 10 },
      nextMilestone: 'Complete Functions Module',
      level: 'Beginner',
    },
    {
      id: 2,
      title: 'React Development',
      progress: 60,
      xpEarned: 600,
      timeSpent: '8.2h',
      modules: { completed: 6, total: 12 },
      nextMilestone: 'Master React Hooks',
      level: 'Intermediate',
    },
    {
      id: 3,
      title: 'Database Design',
      progress: 40,
      xpEarned: 400,
      timeSpent: '5.8h',
      modules: { completed: 4, total: 10 },
      nextMilestone: 'Complete SQL Basics',
      level: 'Beginner',
    },
    {
      id: 4,
      title: 'TypeScript Mastery',
      progress: 25,
      xpEarned: 250,
      timeSpent: '3.2h',
      modules: { completed: 2, total: 8 },
      nextMilestone: 'Learn Type Definitions',
      level: 'Advanced',
    },
  ];

  const achievements = [
    { id: 1, title: 'First Course Completed', icon: '🎓', earned: true, xp: 100 },
    { id: 2, title: '7-Day Streak', icon: '🔥', earned: true, xp: 50 },
    { id: 3, title: 'Quiz Master', icon: '🧠', earned: true, xp: 75 },
    { id: 4, title: 'Fast Learner', icon: '⚡', earned: true, xp: 60 },
    { id: 5, title: 'Knowledge Seeker', icon: '🔍', earned: false, xp: 80 },
    { id: 6, title: 'Study Champion', icon: '🏆', earned: false, xp: 150 },
  ];

  const weeklyGoals = [
    { title: 'Complete 3 modules', progress: 66, completed: 2, total: 3 },
    { title: 'Study 10 hours', progress: 80, completed: 8, total: 10 },
    { title: 'Maintain daily streak', progress: 100, completed: 7, total: 7 },
    { title: 'Submit 2 assignments', progress: 50, completed: 1, total: 2 },
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Target className="h-8 w-8 text-primary" />
          My Learning Progress
        </h1>
        <p className="text-muted-foreground">
          Track your learning journey and celebrate your achievements
        </p>
      </div>

      {/* Level & XP Overview */}
      <Card className="mb-8 bg-gradient-to-r from-primary/10 to-blue/10 border-primary/20">
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold">Level {overallStats.level}</p>
              <p className="text-sm text-muted-foreground">Current Level</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{overallStats.xp} XP</p>
              <p className="text-sm text-muted-foreground">
                {overallStats.xpToNext - overallStats.xp} XP to next level
              </p>
              <Progress 
                value={(overallStats.xp / overallStats.xpToNext) * 100} 
                className="mt-2 h-2"
              />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Flame className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-2xl font-bold">{overallStats.streak} days</p>
              <p className="text-sm text-muted-foreground">Learning Streak</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-2xl font-bold">{overallStats.achievements}</p>
              <p className="text-sm text-muted-foreground">Achievements</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Course Progress */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Progress</CardTitle>
              <CardDescription>Your progress across all enrolled courses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {courseProgress.map((course) => (
                <div key={course.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{course.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {course.modules.completed}/{course.modules.total} modules
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {course.timeSpent}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {course.xpEarned} XP
                        </span>
                      </div>
                    </div>
                    <Badge variant={course.level === 'Beginner' ? 'secondary' : course.level === 'Intermediate' ? 'default' : 'destructive'}>
                      {course.level}
                    </Badge>
                  </div>
                  <Progress value={course.progress} className="h-3" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{course.progress}% complete</span>
                    <span className="text-primary">Next: {course.nextMilestone}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Weekly Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Goals
              </CardTitle>
              <CardDescription>Track your weekly learning objectives</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {weeklyGoals.map((goal, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{goal.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {goal.completed}/{goal.total}
                    </span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Achievements & Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
              <CardDescription>Badges and milestones you've earned</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {achievements.map((achievement) => (
                <div 
                  key={achievement.id} 
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    achievement.earned 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="text-2xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{achievement.title}</p>
                    <p className="text-xs text-muted-foreground">+{achievement.xp} XP</p>
                  </div>
                  {achievement.earned && (
                    <Badge variant="secondary" className="text-xs">
                      Earned
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Learning Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Total Study Time</span>
                <span className="text-sm font-medium">{overallStats.totalHours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Courses Completed</span>
                <span className="text-sm font-medium">
                  {overallStats.completedCourses}/{overallStats.totalCourses}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Average Session</span>
                <span className="text-sm font-medium">45 min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">This Week</span>
                <span className="text-sm font-medium">8.5h</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full" variant="outline">
                View Detailed Analytics
              </Button>
              <Button className="w-full" variant="outline">
                Set New Goals
              </Button>
              <Button className="w-full" variant="outline">
                Share Progress
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}