'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Archive, BookOpen, Clock, Edit, Globe, Lock, Search, Settings, Trash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { courseApi } from '@/lib/api/course';

import type { Course } from '@/lib/types/course';

interface CourseHeaderProps {
  course: Course;
  onUpdate: () => void;
}

export function CourseHeader({ course, onUpdate }: CourseHeaderProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleArchive = async () => {
    try {
      if (course.isArchived) {
        await courseApi.unarchiveCourse(course.id);
        toast({
          title: 'Course unarchived',
          description: 'The course has been restored to your active courses.',
        });
      } else {
        await courseApi.archiveCourse(course.id);
        toast({
          title: 'Course archived',
          description: 'The course has been moved to your archive.',
        });
      }
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${course.isArchived ? 'unarchive' : 'archive'} course.`,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await courseApi.deleteCourse(course.id);
      toast({
        title: 'Course deleted',
        description: 'The course has been permanently deleted.',
      });
      router.push('/courses');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete course.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-4 flex-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold">{course.title}</h1>
                  {course.isArchived && <Badge variant="secondary">Archived</Badge>}
                </div>
                {course.description && (
                  <p className="text-muted-foreground">{course.description}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  {course.isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  <span>{course.isPublic ? 'Public' : 'Private'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{course.moduleCount || 0} modules</span>
                </div>
                {course.totalDuration && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{course.totalDuration} min</span>
                  </div>
                )}
                <div>
                  Updated{' '}
                  {course.updatedAt
                    ? formatDistanceToNow(new Date(course.updatedAt), { addSuffix: true })
                    : 'recently'}
                </div>
              </div>

              {course.settings?.aiPersonalizationEnabled && (
                <Badge variant="outline" className="w-fit">
                  AI Personalization Enabled
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/courses/${course.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/courses/${course.id}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
              <Button variant="outline" onClick={handleArchive}>
                <Archive className="mr-2 h-4 w-4" />
                {course.isArchived ? 'Unarchive' : 'Archive'}
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive hover:text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
