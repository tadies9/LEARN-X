'use client'

import { useState } from 'react'
import { useOnboarding } from '@/contexts/onboarding-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const CONTENT_DENSITY_OPTIONS = [
  {
    value: 'concise',
    label: 'Concise',
    description: 'Get to the point quickly',
    example: 'APIs are messengers between apps. They define communication rules.',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Mix of brevity and detail',
    example: 'APIs (Application Programming Interfaces) enable different software applications to communicate. They establish protocols for requesting and exchanging data.',
  },
  {
    value: 'comprehensive',
    label: 'Comprehensive',
    description: 'Detailed explanations',
    example: 'APIs serve as standardized communication protocols between software applications. They specify request formats, authentication methods, and response structures, enabling seamless integration...',
  },
]

const SUMMARY_STYLES = [
  {
    value: 'bullet_points',
    label: 'Bullet Points',
    example: '• Key concept 1\n• Key concept 2\n• Key concept 3',
  },
  {
    value: 'paragraphs',
    label: 'Paragraphs',
    example: 'This section covers three main concepts. First, we explore...',
  },
  {
    value: 'visual',
    label: 'Visual Diagrams',
    example: '[Flowchart] → [Mind Map] → [Infographic]',
  },
]

export function ContentPreferencesStep() {
  const { nextStep, previousStep, updateFormData, formData } = useOnboarding()
  const [density, setDensity] = useState<string>(
    formData.contentPreferences?.density || 'balanced'
  )
  const [examplesPerConcept, setExamplesPerConcept] = useState<number>(
    formData.contentPreferences?.examplesPerConcept || 2
  )
  const [summaryStyle, setSummaryStyle] = useState<string>(
    formData.contentPreferences?.summaryStyle || 'bullet_points'
  )
  const [detailTolerance, setDetailTolerance] = useState<string>(
    formData.contentPreferences?.detailTolerance || 'medium'
  )
  const [repetitionPreference, setRepetitionPreference] = useState<string>(
    formData.contentPreferences?.repetitionPreference || 'moderate'
  )

  const handleNext = () => {
    updateFormData({
      contentPreferences: {
        density: density as any,
        examplesPerConcept,
        summaryStyle: summaryStyle as any,
        detailTolerance: detailTolerance as any,
        repetitionPreference: repetitionPreference as any,
      },
    })
    nextStep()
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle>Content Preferences</CardTitle>
        <CardDescription>
          Customize how information is presented to match your learning preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Content Density */}
        <div className="space-y-3">
          <h3 className="font-medium">Content Density</h3>
          <RadioGroup value={density} onValueChange={setDensity}>
            <div className="grid gap-3">
              {CONTENT_DENSITY_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={cn(
                    'relative rounded-lg border p-4 cursor-pointer transition-colors hover:bg-muted/50',
                    density === option.value && 'border-primary bg-primary/5'
                  )}
                  onClick={() => setDensity(option.value)}
                >
                  <div className="flex gap-3">
                    <RadioGroupItem
                      value={option.value}
                      id={`density-${option.value}`}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <Label 
                        htmlFor={`density-${option.value}`} 
                        className="font-medium cursor-pointer"
                      >
                        {option.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                      <div className="bg-muted/50 p-2 rounded text-xs">
                        {option.example}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Examples per Concept */}
        <div className="space-y-3">
          <h3 className="font-medium">Examples per Concept</h3>
          <p className="text-sm text-muted-foreground">
            How many examples do you need to understand new concepts?
          </p>
          <div className="space-y-2">
            <Slider
              value={[examplesPerConcept]}
              onValueChange={(value) => setExamplesPerConcept(value[0])}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1 example</span>
              <span className="font-medium text-foreground">{examplesPerConcept} examples</span>
              <span>5 examples</span>
            </div>
          </div>
        </div>

        {/* Summary Style */}
        <div className="space-y-3">
          <h3 className="font-medium">Summary Style</h3>
          <div className="grid gap-2">
            {SUMMARY_STYLES.map((style) => (
              <Button
                key={style.value}
                type="button"
                variant={summaryStyle === style.value ? 'default' : 'outline'}
                className="justify-start h-auto py-3"
                onClick={() => setSummaryStyle(style.value)}
              >
                <div className="text-left">
                  <div className="font-medium">{style.label}</div>
                  <div className="text-xs mt-1 font-normal whitespace-pre-line">
                    {style.example}
                  </div>
                </div>
              </Button>
            ))}
          </div>
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
  )
}