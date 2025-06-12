'use client';

import { useState } from 'react';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const COMMUNICATION_STYLES = [
  {
    value: 'formal',
    label: 'Formal',
    description: 'Professional and academic tone',
    example:
      'The algorithm exhibits O(n log n) time complexity, making it suitable for large-scale data processing applications.',
  },
  {
    value: 'professional_friendly',
    label: 'Professional Friendly',
    description: 'Clear and approachable',
    example:
      'This algorithm is efficient - it can handle large datasets without slowing down significantly.',
  },
  {
    value: 'conversational',
    label: 'Conversational',
    description: 'Like a helpful colleague',
    example:
      'This algorithm is pretty efficient—it can handle big datasets without breaking a sweat!',
  },
  {
    value: 'casual',
    label: 'Casual',
    description: 'Relaxed and informal',
    example: "This algorithm rocks! It chews through huge datasets like it's nothing.",
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
  const [technicalComfort, setTechnicalComfort] = useState<number>(
    (formData.communication?.technicalComfort || 0.5) * 100
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
        style: style as any,
        technicalComfort: technicalComfort / 100,
        encouragementLevel: encouragementLevel as any,
        humorAppropriate,
      },
    });
    nextStep();
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle>Communication Style</CardTitle>
        <CardDescription>How would you like LEARN-X to communicate with you?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Communication Style */}
        <div className="space-y-3">
          <h3 className="font-medium">Tone and Style</h3>
          <RadioGroup value={style} onValueChange={setStyle}>
            <div className="grid gap-3">
              {COMMUNICATION_STYLES.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    'relative rounded-lg border p-4 cursor-pointer transition-colors hover:bg-muted/50',
                    style === option.value && 'border-primary bg-primary/5'
                  )}
                  onClick={() => setStyle(option.value)}
                >
                  <div className="flex gap-3">
                    <RadioGroupItem
                      value={option.value}
                      id={`style-${option.value}`}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <Label
                        htmlFor={`style-${option.value}`}
                        className="font-medium cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                      <div className="bg-muted/50 p-2 rounded text-xs italic">
                        "{option.example}"
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Technical Comfort */}
        <div className="space-y-3">
          <h3 className="font-medium">Technical Language Comfort</h3>
          <p className="text-sm text-muted-foreground">
            How comfortable are you with technical jargon and terminology?
          </p>
          <div className="space-y-2">
            <Slider
              value={[technicalComfort]}
              onValueChange={(value) => setTechnicalComfort(value[0])}
              min={0}
              max={100}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Avoid jargon</span>
              <span className="font-medium text-foreground">{technicalComfort}%</span>
              <span>Technical terms OK</span>
            </div>
          </div>
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
        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
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
