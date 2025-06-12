'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useOnboarding } from '@/contexts/onboarding-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    defaultValues: formData.professional || {
      experienceYears: 0,
      technicalLevel: 'beginner',
    },
  });

  const onSubmit = (data: ProfessionalContextData) => {
    updateFormData({ professional: data });
    nextStep();
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle>Professional Context</CardTitle>
        <CardDescription>
          Tell us about your professional background to help us tailor examples to your experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="role">Current Role/Occupation *</Label>
              <Input
                id="role"
                placeholder="e.g., Software Engineer, Financial Analyst, Student"
                {...register('role')}
              />
              {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="industry">Industry *</Label>
              <Select
                onValueChange={(value) => setValue('industry', value)}
                defaultValue={formData.professional?.industry}
              >
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Select your industry" />
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="experienceYears">Years of Experience</Label>
                <Input
                  id="experienceYears"
                  type="number"
                  min="0"
                  max="50"
                  {...register('experienceYears', { valueAsNumber: true })}
                />
                {errors.experienceYears && (
                  <p className="text-sm text-destructive">{errors.experienceYears.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="technicalLevel">Technical Level *</Label>
                <Select
                  onValueChange={(value) => setValue('technicalLevel', value as any)}
                  defaultValue={formData.professional?.technicalLevel || 'beginner'}
                >
                  <SelectTrigger id="technicalLevel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
                {errors.technicalLevel && (
                  <p className="text-sm text-destructive">{errors.technicalLevel.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="careerAspirations">Career Aspirations (Optional)</Label>
              <Textarea
                id="careerAspirations"
                placeholder="Where do you see your career heading? What skills do you want to develop?"
                rows={3}
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
    </Card>
  );
}
