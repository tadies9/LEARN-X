'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { CourseFilters } from '@/lib/types/course';
import { BookOpen, Plus, Search } from 'lucide-react';

interface EmptyStateProps {
  searchTerm?: string;
  filters: CourseFilters;
}

export function EmptyState({ searchTerm, filters }: EmptyStateProps) {
  const hasActiveFilters = searchTerm || filters.isArchived || filters.isPublic !== undefined;

  if (hasActiveFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No courses found</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          {searchTerm
            ? `No courses match "${searchTerm}". Try adjusting your search or filters.`
            : 'No courses match your current filters. Try adjusting them to see more results.'}
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Create your first course to start organizing your learning materials.
      </p>
      <Button asChild>
        <Link href="/courses/new">
          <Plus className="mr-2 h-4 w-4" />
          Create your first course
        </Link>
      </Button>
    </div>
  );
}
