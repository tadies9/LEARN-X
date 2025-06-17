'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingCard } from '../OnboardingCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { professionalContextSchema, type ProfessionalContextData } from '@/lib/validations/persona';
import { INDUSTRIES } from '@/lib/types/persona';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function ProfessionalStep() {
  const { nextStep, previousStep, updateFormData, formData } = useOnboarding();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProfessionalContextData>({
    resolver: zodResolver(professionalContextSchema),
    defaultValues: formData.professional || {},
  });

  const onSubmit = (data: ProfessionalContextData) => {
    updateFormData({ professional: data });
    nextStep();
  };

  return (
    <OnboardingCard>
      <CardHeader>
        <CardTitle>Academic & Career Goals</CardTitle>
        <CardDescription>
          Tell us about your current studies and future aspirations to personalize your learning journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="role">Current Status *</Label>
              <Input
                id="role"
                placeholder="e.g., Computer Science Student, High School Senior, Recent Graduate"
                {...register('role')}
              />
              {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="fieldOfStudy">Field of Study</Label>
              <Input
                id="fieldOfStudy"
                placeholder="e.g., Computer Science, Business Administration, Data Science"
                {...register('domainExpertise.0')}
              />
              <p className="text-xs text-muted-foreground">Your major or primary area of study</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="industry">Aspired Industry *</Label>
              <Select
                onValueChange={(value) => setValue('industry', value)}
                defaultValue={formData.professional?.industry}
              >
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Select your desired industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.industry && (
                <p className="text-sm text-destructive">{errors.industry.message}</p>
              )}
            </div>


            <div className="grid gap-2">
              <Label htmlFor="careerAspirations">Career Goals & Learning Objectives</Label>
              <Textarea
                id="careerAspirations"
                placeholder="What are your career goals? What skills do you want to learn? What subjects interest you most?"
                rows={4}
                {...register('careerAspirations')}
              />
              {errors.careerAspirations && (
                <p className="text-sm text-destructive">{errors.careerAspirations.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={previousStep}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="submit">
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </OnboardingCard>
  );
}
