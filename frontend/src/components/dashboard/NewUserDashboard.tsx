'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Upload,
  Sparkles,
  Target,
  Rocket,
  ChevronRight,
  Play,
  FileText,
  Users,
  Brain,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FadeIn } from '@/components/animations/FadeIn';
import { cn } from '@/lib/utils';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  color: string;
  badge?: string;
}

interface GuidedStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action: () => void;
}

export function NewUserDashboard() {
  const router = useRouter();
  const [currentStep] = useState(0);

  const guidedSteps: GuidedStep[] = [
    {
      id: 'create-course',
      title: 'Create Your First Course',
      description: 'Start by creating a course for a subject you want to master',
      completed: false,
      action: () => router.push('/courses/new'),
    },
    {
      id: 'upload-materials',
      title: 'Upload Study Materials',
      description: 'Add PDFs, documents, or presentations to your course',
      completed: false,
      action: () => router.push('/courses'),
    },
    {
      id: 'start-learning',
      title: 'Start Your First Study Session',
      description: 'Experience AI-powered personalized learning',
      completed: false,
      action: () => router.push('/courses'),
    },
  ];

  const quickActions: QuickAction[] = [
    {
      title: 'Create Course',
      description: 'Start building your personalized learning journey',
      icon: BookOpen,
      action: () => router.push('/courses/new'),
      color: 'bg-primary/10 hover:bg-primary/20 text-primary',
      badge: 'Recommended',
    },
    {
      title: 'Upload Materials',
      description: 'Import your study materials to get started',
      icon: Upload,
      action: () => router.push('/courses'),
      color:
        'bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/20 dark:hover:bg-purple-900/30',
    },
    {
      title: 'Explore Features',
      description: 'Learn about AI-powered study tools',
      icon: Sparkles,
      action: () => router.push('/features'),
      color:
        'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/20 dark:hover:bg-amber-900/30',
    },
  ];

  const completedSteps = guidedSteps.filter((step) => step.completed).length;
  const progressPercentage = (completedSteps / guidedSteps.length) * 100;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <FadeIn>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">Welcome to LEARN-X! 🎉</CardTitle>
                <CardDescription className="text-base">
                  Your AI-powered learning journey starts here. Let's get you set up in just a few
                  steps.
                </CardDescription>
              </div>
              <Rocket className="h-12 w-12 text-primary opacity-20" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Getting Started Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {completedSteps} of {guidedSteps.length} completed
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              <div className="grid gap-3 mt-6">
                {guidedSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer',
                      step.completed
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                        : index === currentStep
                          ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                          : 'bg-muted/20 border-transparent hover:bg-muted/40'
                    )}
                    onClick={step.action}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                        step.completed
                          ? 'bg-green-500 text-white'
                          : index === currentStep
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {step.completed ? '✓' : index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Quick Actions */}
      <FadeIn delay={0.2}>
        <div>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {quickActions.map((action) => (
              <Card
                key={action.title}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md relative overflow-hidden',
                  action.color
                )}
                onClick={action.action}
              >
                {action.badge && (
                  <Badge className="absolute top-3 right-3" variant="secondary">
                    {action.badge}
                  </Badge>
                )}
                <CardHeader className="pb-3">
                  <action.icon className="h-8 w-8 mb-3" />
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm opacity-90">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Feature Highlights */}
      <FadeIn delay={0.6}>
        <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5">
          <CardHeader>
            <CardTitle>Why LEARN-X?</CardTitle>
            <CardDescription>Discover what makes your learning experience unique</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">AI-Personalized</h4>
                  <p className="text-sm text-muted-foreground">
                    Content adapted to your learning style
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Goal-Oriented</h4>
                  <p className="text-sm text-muted-foreground">
                    Track progress towards your objectives
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Smart Summaries</h4>
                  <p className="text-sm text-muted-foreground">
                    Get key insights from any material
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Collaborative</h4>
                  <p className="text-sm text-muted-foreground">Share and learn with others</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Video Tutorial CTA */}
      <FadeIn delay={0.8}>
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200/50 dark:border-purple-800/50">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Play className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Watch our 2-minute intro video</h3>
                <p className="text-sm text-muted-foreground">
                  Learn how to make the most of LEARN-X
                </p>
              </div>
            </div>
            <Button variant="secondary">
              Watch Now
              <Play className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
