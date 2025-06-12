import { apiClient } from '@/lib/api/client';
import type {
  Course,
  CreateCourseInput,
  UpdateCourseInput,
  CourseFilters,
  CourseSortOptions,
} from '@/lib/types/course';

interface CoursesResponse {
  success: boolean;
  data: Course[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface CourseResponse {
  success: boolean;
  data: Course;
}

interface CourseStatsResponse {
  success: boolean;
  data: {
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
  };
}

export const courseApi = {
  // Get courses with filters
  getCourses: async (
    filters?: CourseFilters & {
      page?: number;
      limit?: number;
      sortBy?: CourseSortOptions['field'];
      sortOrder?: CourseSortOptions['order'];
    }
  ) => {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await apiClient.get<CoursesResponse>(`/courses?${params}`);
    return response.data;
  },

  // Get single course
  getCourse: async (courseId: string) => {
    const response = await apiClient.get<CourseResponse>(`/courses/${courseId}`);
    return response.data.data;
  },

  // Create course
  createCourse: async (courseData: CreateCourseInput) => {
    const response = await apiClient.post<CourseResponse>('/courses', courseData);
    return response.data.data;
  },

  // Update course
  updateCourse: async (courseId: string, updateData: UpdateCourseInput) => {
    const response = await apiClient.patch<CourseResponse>(`/courses/${courseId}`, updateData);
    return response.data.data;
  },

  // Delete course
  deleteCourse: async (courseId: string) => {
    const response = await apiClient.delete<{ success: boolean }>(`/courses/${courseId}`);
    return response.data.success;
  },

  // Archive course
  archiveCourse: async (courseId: string) => {
    const response = await apiClient.post<CourseResponse>(`/courses/${courseId}/archive`);
    return response.data.data;
  },

  // Unarchive course
  unarchiveCourse: async (courseId: string) => {
    const response = await apiClient.post<CourseResponse>(`/courses/${courseId}/unarchive`);
    return response.data.data;
  },

  // Duplicate course
  duplicateCourse: async (courseId: string) => {
    const response = await apiClient.post<CourseResponse>(`/courses/${courseId}/duplicate`);
    return response.data.data;
  },

  // Get course statistics
  getCourseStats: async (courseId: string) => {
    const response = await apiClient.get<CourseStatsResponse>(`/courses/${courseId}/stats`);
    return response.data.data;
  },
};
