import { Button } from '@/components/ui/button';
import { CourseProgressCard } from '@/components/dashboard/CourseProgressCard';
import { FadeIn } from '@/components/animations/FadeIn';

import type { Course } from '@/lib/types/course';

interface CoursesSectionProps {
  courses: Course[];
}

function transformCourseForDisplay(course: Course) {
  return {
    id: course.id,
    title: course.title,
    description: course.description || 'No description available',
    progress: 0,
    totalModules: course.moduleCount || 0,
    completedModules: 0,
    duration: 'Unknown',
    students: 0,
    nextLesson: 'Start Learning',
  };
}

export function CoursesSection({ courses }: CoursesSectionProps) {
  const coursesForDisplay = courses.map(transformCourseForDisplay);

  return (
    <div className="lg:col-span-2 space-y-6">
      <FadeIn delay={0.4}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Continue Learning</h2>
          <Button variant="ghost" size="sm">
            View All Courses
          </Button>
        </div>
      </FadeIn>

      <div className="grid gap-6 md:grid-cols-2">
        {coursesForDisplay.length > 0 ? (
          coursesForDisplay.map((course, index) => (
            <FadeIn key={course.id} delay={0.5 + index * 0.1}>
              <CourseProgressCard course={course} />
            </FadeIn>
          ))
        ) : (
          <div className="col-span-2 text-center text-muted-foreground">
            No courses found.{' '}
            <a href="/courses/new" className="text-primary hover:underline">
              Create your first course
            </a>
          </div>
        )}
      </div>
    </div>
  );
}