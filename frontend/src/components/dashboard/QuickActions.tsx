'use client';

import { useRouter } from 'next/navigation';
import { Plus, Upload, BookOpen, Brain, Target, BarChart3 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  color: string;
  description?: string;
}

export function QuickActions() {
  const router = useRouter();

  const actions: QuickAction[] = [
    {
      label: 'New Course',
      icon: Plus,
      onClick: () => router.push('/courses/new'),
      color: 'text-primary hover:bg-primary/10',
      description: 'Create a new course',
    },
    {
      label: 'Upload',
      icon: Upload,
      onClick: () => router.push('/upload'),
      color: 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20',
      description: 'Add study materials',
    },
    {
      label: 'Study',
      icon: BookOpen,
      onClick: () => router.push('/courses'),
      color: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20',
      description: 'Continue learning',
    },
    {
      label: 'Practice',
      icon: Brain,
      onClick: () => router.push('/practice'),
      color: 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20',
      description: 'Test your knowledge',
    },
    {
      label: 'Goals',
      icon: Target,
      onClick: () => router.push('/goals'),
      color: 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20',
      description: 'Track progress',
    },
    {
      label: 'Analytics',
      icon: BarChart3,
      onClick: () => router.push('/analytics'),
      color: 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
      description: 'View insights',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
        <CardDescription>Common tasks at your fingertips</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              size="sm"
              className={cn(
                'flex flex-col items-center justify-center h-20 gap-1 transition-all',
                action.color
              )}
              onClick={action.onClick}
            >
              <action.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
