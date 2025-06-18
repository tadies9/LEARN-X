'use client';

import { useState } from 'react';

import { ChevronLeft, Edit2, CheckCircle, Sparkles } from 'lucide-react';

import { useOnboarding } from '@/contexts/onboarding-context';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingCard } from '../OnboardingCard';
import { Badge } from '@/components/ui/badge';
import { ButtonLoader } from '@/components/ui/ButtonLoader';
import { Confetti } from '@/components/ui/confetti';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

import type { OnboardingStep } from '@/lib/types/persona';

const STEP_LABELS = {
  'academic-career': 'Academic & Career Goals',
  interests: 'Interests & Goals',
  'learning-style': 'Learning Style',
  'content-preferences': 'Content Preferences',
  communication: 'Communication Style',
};

export function ReviewStep() {
  const { previousStep, goToStep, formData, completeOnboarding, isLoading } = useOnboarding();
  const { toast } = useToast();
  const [showConfetti, setShowConfetti] = useState(false);

  const handleComplete = async () => {
    try {
      await completeOnboarding();
      setShowConfetti(true);
      toast({
        title: 'Welcome to LEARN-X!',
        description: 'Your personalized learning profile has been created.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save your profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const renderProfessionalSummary = () => {
    const prof = formData.academicCareer || formData.professional;
    if (!prof) return null;

    return (
      <div className="space-y-1">
        <p>
          <span className="font-medium">Current Status:</span> {prof.currentStatus || prof.role}
        </p>
        <p>
          <span className="font-medium">Aspired Industry:</span>{' '}
          {prof.aspiredIndustry || prof.industry}
        </p>
        {(prof.fieldOfStudy || prof.domainExpertise?.[0]) && (
          <p>
            <span className="font-medium">Field of Study:</span>{' '}
            {prof.fieldOfStudy || prof.domainExpertise?.[0]}
          </p>
        )}
        {(prof.careerGoalsLearningObjectives || prof.careerAspirations) && (
          <p>
            <span className="font-medium">Career Goals & Learning Objectives:</span>{' '}
            {prof.careerGoalsLearningObjectives || prof.careerAspirations}
          </p>
        )}
      </div>
    );
  };

  const renderInterestsSummary = () => {
    const interests = formData.interests;
    if (!interests) return null;

    return (
      <div className="space-y-2">
        <div>
          <p className="font-medium text-xs mb-1">Primary Interests:</p>
          <div className="flex flex-wrap gap-1">
            {interests.primary.map((interest) => (
              <Badge key={interest} variant="default" className="text-[10px] h-5 px-2">
                {interest}
              </Badge>
            ))}
          </div>
        </div>
        {interests.secondary.length > 0 && (
          <div>
            <p className="font-medium text-xs mb-1">Secondary Interests:</p>
            <div className="flex flex-wrap gap-1">
              {interests.secondary.map((interest) => (
                <Badge key={interest} variant="secondary" className="text-[10px] h-5 px-2">
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="font-medium text-xs mb-1">Learning Topics:</p>
          <div className="flex flex-wrap gap-1">
            {interests.learningTopics.map((topic) => (
              <Badge key={topic} variant="outline" className="text-[10px] h-5 px-2">
                {topic}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderLearningSummary = () => {
    const learning = formData.learningStyle;
    if (!learning) return null;

    return (
      <div className="space-y-1">
        <p>
          <span className="font-medium">Primary:</span> {learning.primary}
        </p>
        {learning.secondary && (
          <p>
            <span className="font-medium">Secondary:</span> {learning.secondary}
          </p>
        )}
        <p>
          <span className="font-medium">Preference Strength:</span>{' '}
          {Math.round(learning.preferenceStrength * 100)}%
        </p>
      </div>
    );
  };

  const renderContentSummary = () => {
    const content = formData.contentPreferences;
    if (!content) return null;

    return (
      <div className="space-y-1">
        <p>
          <span className="font-medium">Density:</span> {content.density}
        </p>
        <p>
          <span className="font-medium">Detail level:</span> {content.detailTolerance}
        </p>
        <p>
          <span className="font-medium">Repetition:</span> {content.repetitionPreference}
        </p>
      </div>
    );
  };

  const renderCommunicationSummary = () => {
    const comm = formData.communication;
    if (!comm) return null;

    return (
      <div className="space-y-1">
        <p>
          <span className="font-medium">Style:</span> {comm.style.replace('_', ' ')}
        </p>
        <p>
          <span className="font-medium">Encouragement:</span> {comm.encouragementLevel}
        </p>
        <p>
          <span className="font-medium">Humor:</span> {comm.humorAppropriate ? 'Yes' : 'No'}
        </p>
      </div>
    );
  };

  const sections = [
    { key: 'academic-career', render: renderProfessionalSummary },
    { key: 'interests', render: renderInterestsSummary },
    { key: 'learning-style', render: renderLearningSummary },
    { key: 'content-preferences', render: renderContentSummary },
    { key: 'communication', render: renderCommunicationSummary },
  ];

  return (
    <>
      <OnboardingCard>
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">Review Your Learning Profile</CardTitle>
          <CardDescription className="text-lg mt-2">
            Let's make sure we've captured everything correctly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.map(({ key, render }) => (
            <div
              key={key}
              className={cn(
                'rounded-lg border-2 border-gray-200 dark:border-gray-800 p-3 space-y-1',
                'bg-white dark:bg-gray-900 hover:shadow-md transition-all duration-200'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-sm">
                  {STEP_LABELS[key as keyof typeof STEP_LABELS]}
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => goToStep(key as OnboardingStep)}
                  disabled={isLoading}
                  className="h-7 w-7 p-0"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">{render()}</div>
            </div>
          ))}

          <div className="bg-primary/5 rounded-lg p-3 mt-6 border border-primary/20">
            <p className="text-xs text-center">
              <span className="font-medium">Remember:</span> You can always update these preferences
              later in your account settings. Your learning profile will continue to adapt as we get
              to know you better!
            </p>
          </div>

          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={previousStep}
              disabled={isLoading}
              className="min-w-[120px]"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleComplete}
              disabled={isLoading}
              size="lg"
              className="min-w-[140px]"
            >
              <ButtonLoader loading={isLoading} loadingText="Creating Profile...">
                Complete Setup
              </ButtonLoader>
            </Button>
          </div>
        </CardContent>
      </OnboardingCard>
      <Confetti active={showConfetti} />
    </>
  );
}
