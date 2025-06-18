import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

interface ModuleBreadcrumbProps {
  courseId: string;
  courseTitle: string;
}

export function ModuleBreadcrumb({ courseId, courseTitle }: ModuleBreadcrumbProps) {
  return (
    <div className="mb-6">
      <Link
        href={`/courses/${courseId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to {courseTitle}
      </Link>
    </div>
  );
}
