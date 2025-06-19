'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/PageLoader';
import { courseApi } from '@/lib/api/course';
import { useDebounce } from '@/hooks/useDebounce';

import { CourseCard } from './components/CourseCard';
import { EmptyState } from './components/EmptyState';
import { CourseFilters } from './components/CourseFilters';

import type { Course, CourseFilters as CourseFilterType } from '@/lib/types/course';
import type { PaginatedData } from '@/lib/types/api';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<CourseFilterType>({
    isArchived: false,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
  });

  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    loadCourses();
  }, [debouncedSearch, filters, pagination.page]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const response = await courseApi.getCourses({
        ...filters,
        search: debouncedSearch,
        page: pagination.page,
        limit: pagination.limit,
      });

      // Handle different response structures
      let items: Course[] = [];
      let paginationData = {
        page: 1,
        limit: pagination.limit,
        total: 0,
        totalPages: 1,
      };

      if (response && typeof response === 'object') {
        if ('success' in response && 'data' in response) {
          // Handle ApiResponse structure
          const apiResponse = response as { success: boolean; data: PaginatedData<Course> | Course[] };
          const responseData = apiResponse.data;
          if (Array.isArray(responseData)) {
            items = responseData;
          } else if (responseData && typeof responseData === 'object' && 'items' in responseData) {
            // Handle PaginatedData structure
            const paginatedData = responseData as PaginatedData<Course>;
            items = Array.isArray(paginatedData.items) ? paginatedData.items : [];
            if ('pagination' in paginatedData && paginatedData.pagination) {
              paginationData = paginatedData.pagination;
            }
          }

          // Handle pagination at response level
          if (
            'pagination' in response &&
            (response as { pagination: typeof paginationData }).pagination
          ) {
            paginationData = (response as { pagination: typeof paginationData }).pagination;
          }
        } else if (Array.isArray(response)) {
          // Handle direct array response
          items = response;
        }
      }

      setCourses(Array.isArray(items) ? items : []);
      setPagination(paginationData);
    } catch (error) {
      // Error loading courses
      setCourses([]); // Ensure courses is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: CourseFilterType) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  if (loading && courses.length === 0) {
    return <PageLoader message="Loading courses..." />;
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Courses</h1>
          <p className="text-muted-foreground mt-2">Manage and organize your learning materials</p>
        </div>
        <Button asChild>
          <Link href="/courses/new">
            <Plus className="mr-2 h-4 w-4" />
            New Course
          </Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <CourseFilters filters={filters} onFilterChange={handleFilterChange} />
      </div>

      {!Array.isArray(courses) || courses.length === 0 ? (
        <EmptyState searchTerm={debouncedSearch} filters={filters} />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} onUpdate={loadCourses} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
