'use client';

import { useState } from 'react';

import { ChevronLeft, ChevronRight, Heart, BookOpen, Info } from 'lucide-react';

import { useOnboarding } from '@/contexts/onboarding-context';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingCard } from '../OnboardingCard';
import { Badge } from '@/components/ui/badge';
import { INTEREST_CATEGORIES, LEARNING_TOPICS } from '@/lib/types/persona';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  const toggleInterest = (interest: string) => {
    // Check if it's already selected
    const isInPrimary = primaryInterests.includes(interest);
    const isInSecondary = secondaryInterests.includes(interest);
    
    if (isInPrimary) {
      // Remove from primary
      setPrimaryInterests((prev) => prev.filter((i) => i !== interest));
    } else if (isInSecondary) {
      // Move from secondary to primary if there's space
      if (primaryInterests.length < 5) {
        setSecondaryInterests((prev) => prev.filter((i) => i !== interest));
        setPrimaryInterests((prev) => [...prev, interest]);
      }
    } else {
      // Add new interest
      if (primaryInterests.length < 5) {
        setPrimaryInterests((prev) => [...prev, interest]);
      } else if (secondaryInterests.length < 5) {
        setSecondaryInterests((prev) => [...prev, interest]);
      }
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
      <CardHeader className="text-center pb-8">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Heart className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-3xl">Your Interests & Learning Goals</CardTitle>
        <CardDescription className="text-lg mt-2">
          Select topics you're passionate about - we'll use these to make your learning more engaging
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm mb-6 flex items-center gap-2">
            <Info className="h-4 w-4" />
            {error}
          </div>
        )}

        <Tabs defaultValue="interests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="interests" className="gap-2">
              <Heart className="h-4 w-4" />
              Personal Interests
            </TabsTrigger>
            <TabsTrigger value="learning" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Learning Topics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="interests" className="space-y-6">
            {/* Selected Interests Summary */}
            {(primaryInterests.length > 0 || secondaryInterests.length > 0) && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="font-medium text-sm mb-3">Your Selected Interests:</h4>
                <div className="space-y-2">
                  {primaryInterests.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Primary ({primaryInterests.length}/5):</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {primaryInterests.map((interest) => (
                          <Badge key={interest} variant="default" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {secondaryInterests.length > 0 && (
                    <div>
                      <span className="text-xs text-muted-foreground">Secondary ({secondaryInterests.length}/5):</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {secondaryInterests.map((interest) => (
                          <Badge key={interest} variant="secondary" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="text-center pb-2">
                <p className="text-sm text-muted-foreground">
                  Click interests to select them. We'll use your top 5 as primary examples.
                </p>
              </div>
              
              {Object.entries(INTEREST_CATEGORIES).map(([category, interests]) => (
                <div key={category} className="space-y-3">
                  <h4 className="text-base font-semibold capitalize flex items-center gap-2">
                    {category}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {interests.map((interest) => {
                      const isPrimary = primaryInterests.includes(interest);
                      const isSecondary = secondaryInterests.includes(interest);
                      const isDisabled = !isPrimary && !isSecondary && 
                        primaryInterests.length >= 5 && secondaryInterests.length >= 5;
                      
                      return (
                        <Button
                          key={interest}
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isDisabled}
                          className={cn(
                            'transition-all duration-200 text-sm',
                            isPrimary && 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary',
                            isSecondary && 'bg-secondary text-secondary-foreground hover:bg-secondary/90 border-secondary',
                            isDisabled && 'opacity-50 cursor-not-allowed'
                          )}
                          onClick={() => toggleInterest(interest)}
                        >
                          {interest}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="learning" className="space-y-6">
            {/* Selected Topics Summary */}
            {learningTopics.length > 0 && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="font-medium text-sm mb-2">
                  Selected Topics ({learningTopics.length}/10):
                </h4>
                <div className="flex flex-wrap gap-2">
                  {learningTopics.map((topic) => (
                    <Badge key={topic} variant="default" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="text-center pb-2">
                <p className="text-sm text-muted-foreground">
                  Select the subjects and skills you want to learn about
                </p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LEARNING_TOPICS.map((topic) => {
                  const isSelected = learningTopics.includes(topic);
                  const isDisabled = !isSelected && learningTopics.length >= 10;
                  
                  return (
                    <Button
                      key={topic}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isDisabled}
                      className={cn(
                        'transition-all duration-200 text-sm',
                        isSelected && 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary',
                        isDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                      onClick={() => toggleLearningTopic(topic)}
                    >
                      {topic}
                    </Button>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-6 border-t">
          <Button type="button" variant="outline" size="lg" onClick={previousStep} className="min-w-[120px]">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleNext} size="lg" className="min-w-[120px]">
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </OnboardingCard>
  );
}
