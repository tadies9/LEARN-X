'use client';

import { useState } from 'react';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ButtonLoader } from '@/components/ui/button-loader';
import { Confetti } from '@/components/ui/confetti';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft, Edit2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEP_LABELS = {
  professional: 'Professional Context',
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
    const prof = formData.professional;
    if (!prof) return null;

    return (
      <div className="space-y-2">
        <p>
          <span className="font-medium">Role:</span> {prof.role}
        </p>
        <p>
          <span className="font-medium">Industry:</span> {prof.industry}
        </p>
        <p>
          <span className="font-medium">Experience:</span> {prof.experienceYears} years
        </p>
        <p>
          <span className="font-medium">Technical Level:</span> {prof.technicalLevel}
        </p>
        {prof.careerAspirations && (
          <p>
            <span className="font-medium">Aspirations:</span> {prof.careerAspirations}
          </p>
        )}
      </div>
    );
  };

  const renderInterestsSummary = () => {
    const interests = formData.interests;
    if (!interests) return null;

    return (
      <div className="space-y-3">
        <div>
          <p className="font-medium mb-1">Primary Interests:</p>
          <div className="flex flex-wrap gap-1">
            {interests.primary.map((interest) => (
              <Badge key={interest} variant="default" className="text-xs">
                {interest}
              </Badge>
            ))}
          </div>
        </div>
        {interests.secondary.length > 0 && (
          <div>
            <p className="font-medium mb-1">Secondary Interests:</p>
            <div className="flex flex-wrap gap-1">
              {interests.secondary.map((interest) => (
                <Badge key={interest} variant="secondary" className="text-xs">
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="font-medium mb-1">Learning Topics:</p>
          <div className="flex flex-wrap gap-1">
            {interests.learningTopics.map((topic) => (
              <Badge key={topic} variant="outline" className="text-xs">
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
      <div className="space-y-2">
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
      <div className="space-y-2">
        <p>
          <span className="font-medium">Density:</span> {content.density}
        </p>
        <p>
          <span className="font-medium">Examples per concept:</span> {content.examplesPerConcept}
        </p>
        <p>
          <span className="font-medium">Summary style:</span>{' '}
          {content.summaryStyle.replace('_', ' ')}
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
      <div className="space-y-2">
        <p>
          <span className="font-medium">Style:</span> {comm.style.replace('_', ' ')}
        </p>
        <p>
          <span className="font-medium">Technical comfort:</span>{' '}
          {Math.round(comm.technicalComfort * 100)}%
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
    { key: 'professional', render: renderProfessionalSummary },
    { key: 'interests', render: renderInterestsSummary },
    { key: 'learning-style', render: renderLearningSummary },
    { key: 'content-preferences', render: renderContentSummary },
    { key: 'communication', render: renderCommunicationSummary },
  ];

  return (
    <>
      <Card className="border-0 shadow-none">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">Review Your Learning Profile</CardTitle>
          <CardDescription>Let's make sure we've captured everything correctly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sections.map(({ key, render }) => (
            <div
              key={key}
              className={cn(
                'rounded-lg border p-4 space-y-2',
                'hover:bg-muted/50 transition-colors'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{STEP_LABELS[key as keyof typeof STEP_LABELS]}</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => goToStep(key as any)}
                  disabled={isLoading}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">{render()}</div>
            </div>
          ))}

          <div className="bg-muted/50 rounded-lg p-4 mt-6">
            <p className="text-sm text-center">
              <span className="font-medium">Remember:</span> You can always update these preferences
              later in your account settings. Your learning profile will continue to adapt as we get
              to know you better!
            </p>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={previousStep} disabled={isLoading}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleComplete} disabled={isLoading} size="lg">
              <ButtonLoader loading={isLoading} loadingText="Creating Profile...">
                Complete Setup
              </ButtonLoader>
            </Button>
          </div>
        </CardContent>
      </Card>
      <Confetti active={showConfetti} />
    </>
  );
}
