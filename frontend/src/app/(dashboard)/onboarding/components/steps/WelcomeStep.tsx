'use client';

import { Sparkles, Clock, Brain, Target } from 'lucide-react';

import { useOnboarding } from '@/contexts/onboarding-context';
import { Button } from '@/components/ui/Button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { OnboardingCard } from '../OnboardingCard';

export function WelcomeStep() {
  const { nextStep } = useOnboarding();

  return (
    <OnboardingCard>
      <CardHeader className="text-center pb-8">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-3xl">Welcome to LEARN-X!</CardTitle>
        <CardDescription className="text-lg mt-2">
          Let's personalize your learning experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pb-8">
        <p className="text-center text-muted-foreground">
          LEARN-X adapts to your unique learning style, interests, and goals. This quick setup will
          help us create the perfect learning environment for you.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold">5 Minutes</h3>
            <p className="text-sm text-muted-foreground">Quick setup</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <Brain className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold">AI-Powered</h3>
            <p className="text-sm text-muted-foreground">Smart adaptation</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold">Personalized</h3>
            <p className="text-sm text-muted-foreground">Just for you</p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-center">
            You can always update your preferences later in settings. Your data is private and used
            only to enhance your learning experience.
          </p>
        </div>

        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={nextStep} className="min-w-[200px]">
            Get Started
          </Button>
        </div>
      </CardContent>
    </OnboardingCard>
  );
}
