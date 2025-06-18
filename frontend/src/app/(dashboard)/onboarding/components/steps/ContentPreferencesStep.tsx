'use client';

import { useState } from 'react';

import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';

import { useOnboarding } from '@/contexts/onboarding-context';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingCard } from '../OnboardingCard';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import type { ContentPreferences } from '@/lib/types/persona';

const CONTENT_DENSITY_OPTIONS = [
  {
    value: 'concise',
    label: 'Concise',
    description: 'Get to the point quickly',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Mix of brevity and detail',
  },
  {
    value: 'comprehensive',
    label: 'Comprehensive',
    description: 'Detailed explanations',
  },
];

export function ContentPreferencesStep() {
  const { nextStep, previousStep, updateFormData, formData } = useOnboarding();
  const [density, setDensity] = useState<string>(
    formData.contentPreferences?.density || 'balanced'
  );
  const [detailTolerance, setDetailTolerance] = useState<string>(
    formData.contentPreferences?.detailTolerance || 'medium'
  );
  const [repetitionPreference, setRepetitionPreference] = useState<string>(
    formData.contentPreferences?.repetitionPreference || 'moderate'
  );

  const handleNext = () => {
    updateFormData({
      contentPreferences: {
        density: density as ContentPreferences['density'],
        examplesPerConcept: 2,
        summaryStyle: 'bullet_points' as ContentPreferences['summaryStyle'],
        detailTolerance: detailTolerance as ContentPreferences['detailTolerance'],
        repetitionPreference: repetitionPreference as ContentPreferences['repetitionPreference'],
      },
    });
    nextStep();
  };

  return (
    <OnboardingCard>
      <CardHeader className="text-center pb-8">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-3xl">Content Preferences</CardTitle>
        <CardDescription className="text-lg mt-2">
          Customize how information is presented to match your learning preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Content Density */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-1">Content Density</h3>
            <p className="text-sm text-muted-foreground">
              How much detail do you prefer in explanations?
            </p>
          </div>
          <RadioGroup value={density} onValueChange={setDensity}>
            <div className="grid grid-cols-3 gap-3">
              {CONTENT_DENSITY_OPTIONS.map((option) => {
                const isSelected = density === option.value;
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
                    onClick={() => setDensity(option.value)}
                  >
                    <div className="flex flex-col items-center text-center space-y-2">
                      <Label
                        htmlFor={`density-${option.value}`}
                        className="font-semibold text-sm cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                      <RadioGroupItem
                        value={option.value}
                        id={`density-${option.value}`}
                        className="absolute top-2 right-2 scale-90"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </RadioGroup>
        </div>

        {/* Detail Tolerance */}
        <div className="space-y-3">
          <h3 className="font-medium">Detail Level</h3>
          <div className="grid grid-cols-3 gap-2">
            {['low', 'medium', 'high'].map((level) => (
              <Button
                key={level}
                type="button"
                variant={detailTolerance === level ? 'default' : 'outline'}
                onClick={() => setDetailTolerance(level)}
                className="capitalize"
              >
                {level}
              </Button>
            ))}
          </div>
        </div>

        {/* Repetition Preference */}
        <div className="space-y-3">
          <h3 className="font-medium">Concept Repetition</h3>
          <div className="grid grid-cols-3 gap-2">
            {['minimal', 'moderate', 'frequent'].map((level) => (
              <Button
                key={level}
                type="button"
                variant={repetitionPreference === level ? 'default' : 'outline'}
                onClick={() => setRepetitionPreference(level)}
                className="capitalize"
              >
                {level}
              </Button>
            ))}
          </div>
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
