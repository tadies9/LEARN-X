'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { ButtonLoader } from '@/components/ui/ButtonLoader';
import { useToast } from '@/components/ui/useToast';
import { courseApi } from '@/lib/api/CourseApiService';
import { updateCourseSchema, type UpdateCourseData } from '@/lib/validations/course';

import type { Course } from '@/lib/types/course';

export default function EditCoursePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<UpdateCourseData>({
    resolver: zodResolver(updateCourseSchema),
  });

  const isPublic = watch('isPublic');

  useEffect(() => {
    loadCourse();
  }, [params.id]);

  const loadCourse = async () => {
    try {
      const data = await courseApi.getCourse(params.id);
      setCourse(data);
      reset({
        title: data.title,
        description: data.description || '',
        isPublic: data.isPublic,
        settings: data.settings,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load course. Please try again.',
        variant: 'destructive',
      });
      router.push('/courses');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: UpdateCourseData) => {
    setSaving(true);
    try {
      await courseApi.updateCourse(params.id, data);
      toast({
        title: 'Course updated',
        description: 'Your changes have been saved successfully.',
      });
      router.push(`/courses/${params.id}/workspace`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update course. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-24 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/courses/${params.id}/workspace`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to course
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Edit Course</CardTitle>
              <CardDescription>Update your course information and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input id="title" {...register('title')} disabled={saving} />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder="What will students learn in this course?"
                  {...register('description')}
                  disabled={saving}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isPublic" className="text-base">
                      Make course public
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow anyone to view and enroll in this course
                    </p>
                  </div>
                  <Switch
                    id="isPublic"
                    checked={isPublic}
                    onCheckedChange={(checked) =>
                      setValue('isPublic', checked, { shouldDirty: true })
                    }
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="aiPersonalization" className="text-base">
                      Enable AI Personalization
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Personalize content based on learner preferences
                    </p>
                  </div>
                  <Switch
                    id="aiPersonalization"
                    checked={watch('settings.aiPersonalizationEnabled') || false}
                    onCheckedChange={(checked) =>
                      setValue('settings.aiPersonalizationEnabled', checked, { shouldDirty: true })
                    }
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !isDirty}>
                  <ButtonLoader loading={saving} loadingText="Saving...">
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </ButtonLoader>
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
