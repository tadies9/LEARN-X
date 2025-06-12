'use client';

import { useState } from 'react';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ChevronLeft, ChevronRight, Eye, Headphones, BookOpen, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';

const LEARNING_STYLES = [
  {
    id: 'visual',
    label: 'Visual',
    icon: Eye,
    description: 'I learn best through diagrams, charts, and visual representations',
    examples: 'Flowcharts, mind maps, color-coded notes, infographics',
  },
  {
    id: 'auditory',
    label: 'Auditory',
    icon: Headphones,
    description: 'I learn best through listening and verbal explanations',
    examples: 'Lectures, discussions, verbal repetition, audio recordings',
  },
  {
    id: 'reading',
    label: 'Reading/Writing',
    icon: BookOpen,
    description: 'I learn best through reading text and taking notes',
    examples: 'Textbooks, written notes, lists, written assignments',
  },
  {
    id: 'kinesthetic',
    label: 'Kinesthetic',
    icon: Hand,
    description: 'I learn best through hands-on experience and practice',
    examples: 'Experiments, simulations, role-play, practical exercises',
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
        primary: primary as any,
        secondary: secondary as any,
        preferenceStrength: preferenceStrength / 100,
      },
    });
    nextStep();
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle>Learning Style Assessment</CardTitle>
        <CardDescription>
          Understanding how you learn best helps us present information in the most effective way
          for you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Learning Style */}
        <div className="space-y-3">
          <h3 className="font-medium">Primary Learning Style</h3>
          <RadioGroup value={primary} onValueChange={setPrimary}>
            <div className="grid gap-3">
              {LEARNING_STYLES.map((style) => {
                const Icon = style.icon;
                return (
                  <div
                    key={style.id}
                    className={cn(
                      'relative rounded-lg border p-4 cursor-pointer transition-colors hover:bg-muted/50',
                      primary === style.id && 'border-primary bg-primary/5'
                    )}
                    onClick={() => setPrimary(style.id)}
                  >
                    <div className="flex gap-3">
                      <RadioGroupItem value={style.id} id={style.id} className="mt-1" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <Label htmlFor={style.id} className="font-medium cursor-pointer">
                            {style.label}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">{style.description}</p>
                        <p className="text-xs text-muted-foreground">Examples: {style.examples}</p>
                      </div>
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
    </Card>
  );
}
