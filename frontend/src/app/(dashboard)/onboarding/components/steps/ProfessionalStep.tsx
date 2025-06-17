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
import { ChevronLeft, ChevronRight, GraduationCap, Target, Briefcase, BookOpen } from 'lucide-react';

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
      <CardHeader className="text-center pb-8">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <GraduationCap className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-3xl">Academic & Career Goals</CardTitle>
        <CardDescription className="text-lg mt-2">
          Tell us about your current studies and future aspirations to personalize your learning journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <Label htmlFor="role" className="text-base font-semibold">Current Status *</Label>
              </div>
              <Input
                id="role"
                placeholder="e.g., Computer Science Student, High School Senior, Recent Graduate"
                className="h-12 text-base"
                {...register('role')}
              />
              {errors.role && <p className="text-sm text-destructive mt-1">{errors.role.message}</p>}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <Label htmlFor="fieldOfStudy" className="text-base font-semibold">Field of Study</Label>
              </div>
              <Input
                id="fieldOfStudy"
                placeholder="e.g., Computer Science, Business Administration, Data Science"
                className="h-12 text-base"
                {...register('domainExpertise.0')}
              />
              <p className="text-sm text-muted-foreground ml-7">Your major or primary area of study</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <Label htmlFor="industry" className="text-base font-semibold">Aspired Industry *</Label>
              </div>
              <Select
                onValueChange={(value) => setValue('industry', value)}
                defaultValue={formData.professional?.industry}
              >
                <SelectTrigger id="industry" className="h-12 text-base">
                  <SelectValue placeholder="Select your desired industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry} className="text-base">
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.industry && (
                <p className="text-sm text-destructive mt-1">{errors.industry.message}</p>
              )}
            </div>


            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <Label htmlFor="careerAspirations" className="text-base font-semibold">Career Goals & Learning Objectives</Label>
                  <p className="text-sm text-muted-foreground mt-1">Share your aspirations to help us tailor your learning experience</p>
                </div>
              </div>
              <Textarea
                id="careerAspirations"
                placeholder="What are your career goals? What skills do you want to learn? What subjects interest you most?"
                rows={5}
                className="text-base resize-none"
                {...register('careerAspirations')}
              />
              {errors.careerAspirations && (
                <p className="text-sm text-destructive mt-1">{errors.careerAspirations.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t">
            <Button type="button" variant="outline" size="lg" onClick={previousStep} className="min-w-[120px]">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="submit" size="lg" className="min-w-[120px]">
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </OnboardingCard>
  );
}
