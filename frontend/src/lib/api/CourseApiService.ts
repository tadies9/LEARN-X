import { BaseApiService, ApiFilters } from './BaseApiService';
import { API_CLIENT } from './client';

import type {

  Course,
  CreateCourseInput,
  UpdateCourseInput,
  CourseFilters,
  CourseSortOptions,
} from '@/lib/types/course';

interface CourseStats {
  moduleCount: number;
  totalFiles: number;
  totalFileSize: number;
  fileTypes: Record<string, number>;
  processingStatus: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  estimatedDuration: number;
}

class CourseApiService extends BaseApiService {
  constructor() {
    super(API_CLIENT, '/courses');
  }

  // Get courses with filters
  async getCourses(
    filters?: CourseFilters & {
      page?: number;
      limit?: number;
      sortBy?: CourseSortOptions['field'];
      sortOrder?: CourseSortOptions['order'];
    }
  ) {
    // Convert to ApiFilters format
    const apiFilters: ApiFilters | undefined = filters ? {
      ...filters,
      page: filters.page,
      limit: filters.limit,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    } : undefined;
    return this.getList<Course>(undefined, apiFilters);
  }

  // Get single course
  async getCourse(courseId: string) {
    return this.getById<Course>(courseId);
  }

  // Create course
  async createCourse(courseData: CreateCourseInput) {
    return this.create<Course, CreateCourseInput>(courseData);
  }

  // Update course
  async updateCourse(courseId: string, updateData: UpdateCourseInput) {
    return this.update<Course, UpdateCourseInput>(courseId, updateData);
  }

  // Delete course
  async deleteCourse(courseId: string) {
    return this.delete(courseId);
  }

  // Archive course
  async archiveCourse(courseId: string) {
    return this.performAction<Course>(courseId, 'archive');
  }

  // Unarchive course
  async unarchiveCourse(courseId: string) {
    return this.performAction<Course>(courseId, 'unarchive');
  }

  // Duplicate course
  async duplicateCourse(courseId: string) {
    return this.performAction<Course>(courseId, 'duplicate');
  }

  // Get course statistics
  async getCourseStats(courseId: string) {
    return this.getStats<CourseStats>(courseId);
  }
}

export const courseApiService = new CourseApiService();

// Export for backward compatibility
export const courseApi = {
  getCourses: courseApiService.getCourses.bind(courseApiService),
  getCourse: courseApiService.getCourse.bind(courseApiService),
  createCourse: courseApiService.createCourse.bind(courseApiService),
  updateCourse: courseApiService.updateCourse.bind(courseApiService),
  deleteCourse: courseApiService.deleteCourse.bind(courseApiService),
  archiveCourse: courseApiService.archiveCourse.bind(courseApiService),
  unarchiveCourse: courseApiService.unarchiveCourse.bind(courseApiService),
  duplicateCourse: courseApiService.duplicateCourse.bind(courseApiService),
  getCourseStats: courseApiService.getCourseStats.bind(courseApiService),
};