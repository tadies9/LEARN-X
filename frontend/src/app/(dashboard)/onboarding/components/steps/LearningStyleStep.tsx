'use client';

import { useState } from 'react';

import { ChevronLeft, ChevronRight, Eye, Headphones, BookOpen, Hand, Brain } from 'lucide-react';

import { useOnboarding } from '@/contexts/onboarding-context';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingCard } from '../OnboardingCard';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

import type { LearningStyle } from '@/lib/types/persona';

const LEARNING_STYLES = [
  {
    id: 'visual',
    label: 'Visual',
    icon: Eye,
    description: 'Diagrams, charts & visuals',
    examples: 'Mind maps, infographics',
  },
  {
    id: 'auditory',
    label: 'Auditory',
    icon: Headphones,
    description: 'Listening & discussions',
    examples: 'Lectures, podcasts',
  },
  {
    id: 'reading',
    label: 'Reading/Writing',
    icon: BookOpen,
    description: 'Reading & note-taking',
    examples: 'Books, written guides',
  },
  {
    id: 'kinesthetic',
    label: 'Kinesthetic',
    icon: Hand,
    description: 'Hands-on practice',
    examples: 'Labs, experiments',
  },
] as const;

export function LearningStyleStep() {
  const { nextStep, previousStep, updateFormData, formData } = useOnboarding();
  const [primary, setPrimary] = useState<string>(formData.learningStyle?.primary || 'visual');
  const [secondary, setSecondary] = useState<string | undefined>(formData.learningStyle?.secondary);
  const [preferenceStrength, setPreferenceStrength] = useState<number>(
    (formData.learningStyle?.preferenceStrength || 0.8) * 100
  );

  const handleNext = () => {
    updateFormData({
      learningStyle: {
        primary: primary as LearningStyle['primary'],
        secondary: secondary as LearningStyle['secondary'],
        preferenceStrength: preferenceStrength / 100,
      },
    });
    nextStep();
  };

  return (
    <OnboardingCard>
      <CardHeader className="text-center pb-8">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Brain className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-3xl">Learning Style Assessment</CardTitle>
        <CardDescription className="text-lg mt-2">
          Understanding how you learn best helps us present information in the most effective way
          for you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Learning Style */}
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-1">Select Your Primary Learning Style</h3>
            <p className="text-sm text-muted-foreground">
              Choose the way you learn most effectively
            </p>
          </div>
          <RadioGroup value={primary} onValueChange={setPrimary}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LEARNING_STYLES.map((style) => {
                const Icon = style.icon;
                const isSelected = primary === style.id;
                return (
                  <div
                    key={style.id}
                    className={cn(
                      'relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200',
                      'hover:shadow-md hover:border-primary/50',
                      isSelected
                        ? 'border-primary shadow-md'
                        : 'border-gray-200 dark:border-gray-800',
                      'bg-white dark:bg-gray-900'
                    )}
                    onClick={() => setPrimary(style.id)}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div
                        className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                          isSelected ? 'bg-primary/20' : 'bg-gray-100 dark:bg-gray-800'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-6 w-6 transition-colors',
                            isSelected ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
                          )}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={style.id} className="font-semibold text-sm cursor-pointer">
                          {style.label}
                        </Label>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {style.description}
                        </p>
                      </div>
                      <div className="pt-1 border-t border-gray-100 dark:border-gray-800 w-full">
                        <p className="text-[10px] text-muted-foreground">
                          <span className="font-medium">e.g.</span> {style.examples}
                        </p>
                      </div>
                      <RadioGroupItem
                        value={style.id}
                        id={style.id}
                        className="absolute top-3 right-3 scale-90"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </RadioGroup>
        </div>

        {/* Secondary Learning Style */}
        <div className="space-y-3">
          <h3 className="font-medium">Secondary Learning Style (Optional)</h3>
          <p className="text-sm text-muted-foreground">
            Many people have a secondary learning style that complements their primary style
          </p>
          <div className="grid gap-2">
            {LEARNING_STYLES.filter((style) => style.id !== primary).map((style) => {
              const Icon = style.icon;
              return (
                <Button
                  key={style.id}
                  type="button"
                  variant={secondary === style.id ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => setSecondary(secondary === style.id ? undefined : style.id)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {style.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Preference Strength */}
        <div className="space-y-3">
          <h3 className="font-medium">Learning Style Strength</h3>
          <p className="text-sm text-muted-foreground">
            How strongly do you prefer your primary learning style?
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Mixed styles work well</span>
              <span>Strong preference</span>
            </div>
            <Slider
              value={[preferenceStrength]}
              onValueChange={(value) => setPreferenceStrength(value[0])}
              min={0}
              max={100}
              step={10}
              className="w-full"
            />
            <div className="text-center text-sm font-medium">{preferenceStrength}%</div>
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
