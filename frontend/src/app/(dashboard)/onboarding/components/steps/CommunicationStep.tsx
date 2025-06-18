'use client';

import { useState } from 'react';

import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';

import { useOnboarding } from '@/contexts/onboarding-context';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingCard } from '../OnboardingCard';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import type { CommunicationTone } from '@/lib/types/persona';

const COMMUNICATION_STYLES = [
  {
    value: 'formal',
    label: 'Formal',
    description: 'Professional and academic',
  },
  {
    value: 'professional_friendly',
    label: 'Friendly',
    description: 'Clear and approachable',
  },
  {
    value: 'conversational',
    label: 'Conversational',
    description: 'Like a helpful colleague',
  },
  {
    value: 'casual',
    label: 'Casual',
    description: 'Relaxed and informal',
  },
];

const ENCOURAGEMENT_LEVELS = [
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Focus on facts',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Occasional encouragement',
  },
  {
    value: 'high',
    label: 'High',
    description: 'Frequent positive reinforcement',
  },
];

export function CommunicationStep() {
  const { nextStep, previousStep, updateFormData, formData } = useOnboarding();
  const [style, setStyle] = useState<string>(
    formData.communication?.style || 'professional_friendly'
  );
  const [encouragementLevel, setEncouragementLevel] = useState<string>(
    formData.communication?.encouragementLevel || 'moderate'
  );
  const [humorAppropriate, setHumorAppropriate] = useState<boolean>(
    formData.communication?.humorAppropriate || false
  );

  const handleNext = () => {
    updateFormData({
      communication: {
        style: style as CommunicationTone['style'],
        technicalComfort: 0.5,
        encouragementLevel: encouragementLevel as CommunicationTone['encouragementLevel'],
        humorAppropriate,
      },
    });
    nextStep();
  };

  return (
    <OnboardingCard>
      <CardHeader className="text-center pb-8">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-3xl">Communication Style</CardTitle>
        <CardDescription className="text-lg mt-2">
          How would you like LEARN-X to communicate with you?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Communication Style */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-1">Tone and Style</h3>
            <p className="text-sm text-muted-foreground">Choose how you'd like us to communicate</p>
          </div>
          <RadioGroup value={style} onValueChange={setStyle}>
            <div className="grid grid-cols-2 gap-3">
              {COMMUNICATION_STYLES.map((option) => {
                const isSelected = style === option.value;
                return (
                  <div
                    key={option.value}
                    className={cn(
                      'relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200',
                      'hover:shadow-md hover:border-primary/50',
                      isSelected
                        ? 'border-primary shadow-md'
                        : 'border-gray-200 dark:border-gray-800',
                      'bg-white dark:bg-gray-900'
                    )}
                    onClick={() => setStyle(option.value)}
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      <Label
                        htmlFor={`style-${option.value}`}
                        className="font-semibold text-sm cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                      <RadioGroupItem
                        value={option.value}
                        id={`style-${option.value}`}
                        className="absolute top-2 right-2 scale-90"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </RadioGroup>
        </div>

        {/* Encouragement Level */}
        <div className="space-y-3">
          <h3 className="font-medium">Encouragement Level</h3>
          <p className="text-sm text-muted-foreground">
            How much positive reinforcement would you like?
          </p>
          <div className="grid gap-2">
            {ENCOURAGEMENT_LEVELS.map((level) => (
              <Button
                key={level.value}
                type="button"
                variant={encouragementLevel === level.value ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => setEncouragementLevel(level.value)}
              >
                <div className="text-left">
                  <div className="font-medium">{level.label}</div>
                  <div className="text-xs font-normal">{level.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Humor Toggle */}
        <div className="flex items-center justify-between space-x-2 rounded-lg border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="space-y-0.5">
            <Label htmlFor="humor" className="font-medium">
              Include Humor
            </Label>
            <p className="text-sm text-muted-foreground">
              Occasional light humor to make learning more enjoyable
            </p>
          </div>
          <Switch id="humor" checked={humorAppropriate} onCheckedChange={setHumorAppropriate} />
        </div>

        <div className="flex justify-between pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={previousStep}
            className="min-w-[120px]"
          >
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
