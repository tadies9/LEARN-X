'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { useToast } from '@/components/ui/use-toast';
import { courseApi } from '@/lib/api/course';
import type { Course } from '@/lib/types/course';
import {
  Archive,
  BookOpen,
  Clock,
  Copy,
  Edit,
  Globe,
  Lock,
  MoreVertical,
  Trash,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CourseCardProps {
  course: Course;
  onUpdate: () => void;
}

export function CourseCard({ course, onUpdate }: CourseCardProps) {
  const { toast } = useToast();
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

  const handleDuplicate = async () => {
    try {
      await courseApi.duplicateCourse(course.id);
      toast({
        title: 'Course duplicated',
        description: 'A copy of the course has been created.',
      });
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate course.',
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
      onUpdate();
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
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="line-clamp-2">
              <Link href={`/courses/${course.id}/workspace`} className="hover:underline">
                {course.title}
              </Link>
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {course.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              <span>{course.isPublic ? 'Public' : 'Private'}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isDeleting}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/courses/${course.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="mr-2 h-4 w-4" />
                {course.isArchived ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {course.description && (
          <CardDescription className="line-clamp-2 mt-2">{course.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
        </div>
      </CardContent>

      <CardFooter className="pt-auto">
        <div className="flex items-center justify-between w-full">
          <p className="text-sm text-muted-foreground">
            Updated{' '}
            {course.updatedAt
              ? formatDistanceToNow(new Date(course.updatedAt), { addSuffix: true })
              : 'recently'}
          </p>
          <div className="flex items-center gap-2">
            {course.isArchived && <Badge variant="secondary">Archived</Badge>}
            <Button asChild size="sm" variant="default">
              <Link href={`/courses/${course.id}/workspace`}>
                <BookOpen className="mr-2 h-4 w-4" />
                Open
              </Link>
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
