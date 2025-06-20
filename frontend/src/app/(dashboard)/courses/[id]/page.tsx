'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageLoader } from '@/components/ui/PageLoader';

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  useEffect(() => {
    // Redirect to the new workspace page
    router.replace(`/courses/${courseId}/workspace`);
  }, [courseId, router]);

  // Always show loading since we're redirecting
  return <PageLoader message="Redirecting to workspace..." />;
}
