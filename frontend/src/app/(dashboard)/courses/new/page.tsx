'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ButtonLoader } from '@/components/ui/button-loader';
import { useToast } from '@/components/ui/use-toast';
import { createCourseSchema, type CreateCourseData } from '@/lib/validations/course';
import { courseApi } from '@/lib/api/course';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function NewCoursePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateCourseData>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      isPublic: false,
      settings: {
        aiPersonalizationEnabled: true,
        allowDownloads: true,
        allowSharing: false,
        requireSequentialProgress: false,
      },
    },
  });

  const isPublic = watch('isPublic');
  const settings = watch('settings');

  const onSubmit = async (data: CreateCourseData) => {
    setIsCreating(true);
    try {
      const course = await courseApi.createCourse(data);

      toast({
        title: 'Course created',
        description: 'Your course has been created successfully.',
      });

      // Redirect to course page
      router.push(`/courses/${course.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create course. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create New Course</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new course to organize your learning materials
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Course Information</CardTitle>
            <CardDescription>Basic details about your course</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Introduction to Machine Learning"
                {...register('title')}
                disabled={isCreating}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What will you learn in this course?"
                rows={4}
                {...register('description')}
                disabled={isCreating}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visibility Settings</CardTitle>
            <CardDescription>Control who can access your course</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="public">Make course public</Label>
                <p className="text-sm text-muted-foreground">Allow anyone to view this course</p>
              </div>
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={(checked) => setValue('isPublic', checked)}
                disabled={isCreating}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Course Settings</CardTitle>
            <CardDescription>Configure how your course works</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-personalization">AI Personalization</Label>
                <p className="text-sm text-muted-foreground">
                  Enable AI-powered content personalization
                </p>
              </div>
              <Switch
                id="ai-personalization"
                checked={settings?.aiPersonalizationEnabled}
                onCheckedChange={(checked) =>
                  setValue('settings.aiPersonalizationEnabled', checked)
                }
                disabled={isCreating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-downloads">Allow Downloads</Label>
                <p className="text-sm text-muted-foreground">Let users download course materials</p>
              </div>
              <Switch
                id="allow-downloads"
                checked={settings?.allowDownloads}
                onCheckedChange={(checked) => setValue('settings.allowDownloads', checked)}
                disabled={isCreating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-sharing">Allow Sharing</Label>
                <p className="text-sm text-muted-foreground">
                  Users can share this course with others
                </p>
              </div>
              <Switch
                id="allow-sharing"
                checked={settings?.allowSharing}
                onCheckedChange={(checked) => setValue('settings.allowSharing', checked)}
                disabled={isCreating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sequential-progress">Sequential Progress</Label>
                <p className="text-sm text-muted-foreground">
                  Require modules to be completed in order
                </p>
              </div>
              <Switch
                id="sequential-progress"
                checked={settings?.requireSequentialProgress}
                onCheckedChange={(checked) =>
                  setValue('settings.requireSequentialProgress', checked)
                }
                disabled={isCreating}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isCreating}>
            <ButtonLoader loading={isCreating} loadingText="Creating...">
              <BookOpen className="mr-2 h-4 w-4" />
              Create Course
            </ButtonLoader>
          </Button>
        </div>
      </form>
    </div>
  );
}
