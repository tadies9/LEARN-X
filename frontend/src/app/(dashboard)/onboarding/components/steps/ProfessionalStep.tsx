'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Button } from '@/components/ui/Button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { OnboardingCard } from '../OnboardingCard';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { academicCareerSchema, type AcademicCareerData } from '@/lib/validations/persona';
import { INDUSTRIES } from '@/lib/types/persona';
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Target,
  Briefcase,
  BookOpen,
} from 'lucide-react';

export function ProfessionalStep() {
  const { nextStep, previousStep, updateFormData, formData } = useOnboarding();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch: _watch,
  } = useForm<AcademicCareerData>({
    resolver: zodResolver(academicCareerSchema),
    defaultValues: formData.academicCareer || {},
  });

  const onSubmit = (data: AcademicCareerData) => {
    updateFormData({ academicCareer: data });
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
          Tell us about your current studies and future aspirations to personalize your learning
          journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <Label htmlFor="currentStatus" className="text-base font-semibold">
                  Current Status *
                </Label>
              </div>
              <Input
                id="currentStatus"
                placeholder="e.g., Computer Science Student, High School Senior, Recent Graduate"
                className="h-12 text-base"
                {...register('currentStatus')}
              />
              {errors.currentStatus && (
                <p className="text-sm text-destructive mt-1">{errors.currentStatus.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <Label htmlFor="fieldOfStudy" className="text-base font-semibold">
                  Field of Study
                </Label>
              </div>
              <Input
                id="fieldOfStudy"
                placeholder="e.g., Computer Science, Business Administration, Data Science"
                className="h-12 text-base"
                {...register('fieldOfStudy')}
              />
              <p className="text-sm text-muted-foreground ml-7">
                Your major or primary area of study
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <Label htmlFor="aspiredIndustry" className="text-base font-semibold">
                  Aspired Industry *
                </Label>
              </div>
              <Select
                onValueChange={(value) => setValue('aspiredIndustry', value)}
                defaultValue={formData.academicCareer?.aspiredIndustry}
              >
                <SelectTrigger id="aspiredIndustry" className="h-12 text-base">
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
              {errors.aspiredIndustry && (
                <p className="text-sm text-destructive mt-1">{errors.aspiredIndustry.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <Label
                    htmlFor="careerGoalsLearningObjectives"
                    className="text-base font-semibold"
                  >
                    Career Goals & Learning Objectives
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Share your aspirations to help us tailor your learning experience
                  </p>
                </div>
              </div>
              <Textarea
                id="careerGoalsLearningObjectives"
                placeholder="What are your career goals? What skills do you want to learn? What subjects interest you most?"
                rows={5}
                className="text-base resize-none"
                {...register('careerGoalsLearningObjectives')}
              />
              {errors.careerGoalsLearningObjectives && (
                <p className="text-sm text-destructive mt-1">
                  {errors.careerGoalsLearningObjectives.message}
                </p>
              )}
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
