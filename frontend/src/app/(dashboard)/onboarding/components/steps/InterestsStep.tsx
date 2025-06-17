'use client';

import { useState } from 'react';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';

import { useOnboarding } from '@/contexts/onboarding-context';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingCard } from '../OnboardingCard';
import { Badge } from '@/components/ui/badge';
import { INTEREST_CATEGORIES, LEARNING_TOPICS } from '@/lib/types/persona';
import { cn } from '@/lib/utils';

export function InterestsStep() {
  const { nextStep, previousStep, updateFormData, formData } = useOnboarding();
  const [primaryInterests, setPrimaryInterests] = useState<string[]>(
    formData.interests?.primary || []
  );
  const [secondaryInterests, setSecondaryInterests] = useState<string[]>(
    formData.interests?.secondary || []
  );
  const [learningTopics, setLearningTopics] = useState<string[]>(
    formData.interests?.learningTopics || []
  );
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = (interest: string, isPrimary: boolean) => {
    if (isPrimary) {
      setPrimaryInterests((prev) =>
        prev.includes(interest)
          ? prev.filter((i) => i !== interest)
          : prev.length < 5
            ? [...prev, interest]
            : prev
      );
      // Remove from secondary if adding to primary
      setSecondaryInterests((prev) => prev.filter((i) => i !== interest));
    } else {
      setSecondaryInterests((prev) =>
        prev.includes(interest)
          ? prev.filter((i) => i !== interest)
          : prev.length < 5
            ? [...prev, interest]
            : prev
      );
      // Remove from primary if adding to secondary
      setPrimaryInterests((prev) => prev.filter((i) => i !== interest));
    }
  };

  const toggleLearningTopic = (topic: string) => {
    setLearningTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : prev.length < 10
          ? [...prev, topic]
          : prev
    );
  };

  const handleNext = () => {
    if (primaryInterests.length === 0) {
      setError('Please select at least one primary interest');
      return;
    }
    if (learningTopics.length === 0) {
      setError('Please select at least one learning topic');
      return;
    }

    updateFormData({
      interests: {
        primary: primaryInterests,
        secondary: secondaryInterests,
        learningTopics,
      },
    });
    nextStep();
  };

  return (
    <OnboardingCard>
      <CardHeader>
        <CardTitle>Personal Interests & Learning Goals</CardTitle>
        <CardDescription>
          Help us create relevant examples and analogies based on your interests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Primary Interests */}
        <div className="space-y-3">
          <div>
            <h3 className="font-medium mb-1">Primary Interests (up to 5)</h3>
            <p className="text-sm text-muted-foreground">
              These will be your main sources for examples and analogies
            </p>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[32px] p-3 border rounded-md bg-muted/20">
            {primaryInterests.length > 0 ? (
              primaryInterests.map((interest) => (
                <Badge key={interest} variant="default" className="gap-1">
                  {interest}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => toggleInterest(interest, true)}
                  />
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Click interests below to add</span>
            )}
          </div>
        </div>

        {/* Secondary Interests */}
        <div className="space-y-3">
          <div>
            <h3 className="font-medium mb-1">Secondary Interests (optional, up to 5)</h3>
            <p className="text-sm text-muted-foreground">Additional interests for variety</p>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[32px] p-3 border rounded-md bg-muted/20">
            {secondaryInterests.length > 0 ? (
              secondaryInterests.map((interest) => (
                <Badge key={interest} variant="secondary" className="gap-1">
                  {interest}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => toggleInterest(interest, false)}
                  />
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Click interests below to add</span>
            )}
          </div>
        </div>

        {/* Interest Categories */}
        <div className="space-y-4">
          <h3 className="font-medium">Choose Your Interests</h3>
          {Object.entries(INTEREST_CATEGORIES).map(([category, interests]) => (
            <div key={category} className="space-y-2">
              <h4 className="text-sm font-medium capitalize text-muted-foreground">{category}</h4>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => {
                  const isPrimary = primaryInterests.includes(interest);
                  const isSecondary = secondaryInterests.includes(interest);
                  return (
                    <Button
                      key={interest}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        'transition-colors',
                        isPrimary && 'bg-primary text-primary-foreground hover:bg-primary/90',
                        isSecondary &&
                          'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                      )}
                      onClick={() => toggleInterest(interest, !isSecondary)}
                    >
                      {interest}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Learning Topics */}
        <div className="space-y-3">
          <div>
            <h3 className="font-medium mb-1">What do you want to learn? (up to 10)</h3>
            <p className="text-sm text-muted-foreground">
              Select the topics you're interested in studying
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {LEARNING_TOPICS.map((topic) => {
              const isSelected = learningTopics.includes(topic);
              return (
                <Button
                  key={topic}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    'transition-colors',
                    isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90'
                  )}
                  onClick={() => toggleLearningTopic(topic)}
                >
                  {topic}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={previousStep}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </OnboardingCard>
  );
}
