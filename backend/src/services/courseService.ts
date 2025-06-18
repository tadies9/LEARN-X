import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

interface CourseModule {
  id: string;
  title: string;
  description?: string;
  position: number;
  is_published: boolean;
  estimated_duration?: number;
  files?: Array<{ count: number }>;
}

interface CourseFile {
  id: string;
  file_type?: string;
  file_size_bytes?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

interface CourseFilters {
  search?: string;
  isPublic?: boolean;
  isArchived?: boolean;
  userId?: string;
  userIdOrPublic?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class CourseService {
  async getCourses(filters: CourseFilters) {
    try {
      const {
        search,
        isPublic,
        isArchived = false,
        userId,
        userIdOrPublic,
        page = 1,
        limit = 20,
        sortBy = 'updated_at',
        sortOrder = 'desc',
      } = filters;

      let query = supabase.from('courses').select('*, modules(count)', { count: 'exact' });

      // Apply filters
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      if (typeof isPublic === 'boolean') {
        query = query.eq('is_public', isPublic);
      }

      if (typeof isArchived === 'boolean') {
        query = query.eq('is_archived', isArchived);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Include user's own courses and public courses
      if (userIdOrPublic) {
        query = query.or(`user_id.eq.${userIdOrPublic},is_public.eq.true`);
      }

      // Sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: courses, error, count } = await query;

      if (error) throw error;

      // Transform the data to include module count
      const transformedCourses = courses?.map((course) => ({
        ...course,
        moduleCount: course.modules?.[0]?.count || 0,
        modules: undefined, // Remove the count object
      }));

      return {
        courses: transformedCourses || [],
        total: count || 0,
        page,
        limit,
      };
    } catch (error) {
      logger.error('Error fetching courses:', error);
      throw error;
    }
  }

  async getCourse(courseId: string, userId: string) {
    try {
      const { data: course, error } = await supabase
        .from('courses')
        .select(
          `
          *,
          modules (
            *,
            files (count)
          )
        `
        )
        .eq('id', courseId)
        .or(`user_id.eq.${userId},is_public.eq.true`)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (course) {
        // Calculate total duration and file count
        let totalDuration = 0;
        const modulesWithCounts = course.modules?.map((module: CourseModule) => {
          totalDuration += module.estimated_duration || 0;
          return {
            ...module,
            fileCount: module.files?.[0]?.count || 0,
            files: undefined,
          };
        });

        return {
          ...course,
          modules: modulesWithCounts || [],
          moduleCount: course.modules?.length || 0,
          totalDuration,
        };
      }

      return null;
    } catch (error) {
      logger.error('Error fetching course:', error);
      throw error;
    }
  }

  async createCourse(courseData: {
    userId: string;
    title: string;
    description?: string;
    isPublic?: boolean;
    settings?: Record<string, unknown>;
  }) {
    try {
      const { data: course, error } = await supabase
        .from('courses')
        .insert({
          user_id: courseData.userId,
          title: courseData.title,
          description: courseData.description,
          is_public: courseData.isPublic || false,
          settings: courseData.settings || {},
        })
        .select()
        .single();

      if (error) throw error;

      return course;
    } catch (error) {
      logger.error('Error creating course:', error);
      throw error;
    }
  }

  async updateCourse(
    courseId: string,
    updateData: {
      title?: string;
      description?: string;
      isPublic?: boolean;
      isArchived?: boolean;
      settings?: Record<string, unknown>;
    }
  ) {
    try {
      const { data: course, error } = await supabase
        .from('courses')
        .update({
          title: updateData.title,
          description: updateData.description,
          is_public: updateData.isPublic,
          is_archived: updateData.isArchived,
          settings: updateData.settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', courseId)
        .select()
        .single();

      if (error) throw error;

      return course;
    } catch (error) {
      logger.error('Error updating course:', error);
      throw error;
    }
  }

  async deleteCourse(courseId: string) {
    try {
      const { error } = await supabase.from('courses').delete().eq('id', courseId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error deleting course:', error);
      throw error;
    }
  }

  async checkCourseOwnership(courseId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('user_id')
        .eq('id', courseId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return false;
        throw error;
      }

      return data?.user_id === userId;
    } catch (error) {
      logger.error('Error checking course ownership:', error);
      throw error;
    }
  }

  async duplicateCourse(courseId: string, userId: string) {
    try {
      // Get the original course with modules
      const { data: originalCourse, error: fetchError } = await supabase
        .from('courses')
        .select(
          `
          *,
          modules (*)
        `
        )
        .eq('id', courseId)
        .single();

      if (fetchError) throw fetchError;

      // Create the duplicated course
      const { data: newCourse, error: createError } = await supabase
        .from('courses')
        .insert({
          user_id: userId,
          title: `${originalCourse.title} (Copy)`,
          description: originalCourse.description,
          is_public: false, // Always make copies private
          settings: originalCourse.settings,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Duplicate modules if any
      if (originalCourse.modules && originalCourse.modules.length > 0) {
        const modulesToInsert = originalCourse.modules.map((module: CourseModule) => ({
          course_id: newCourse.id,
          title: module.title,
          description: module.description,
          position: module.position,
          is_published: false, // Unpublish copied modules
          estimated_duration: module.estimated_duration,
        }));

        const { error: modulesError } = await supabase.from('modules').insert(modulesToInsert);

        if (modulesError) throw modulesError;
      }

      return newCourse;
    } catch (error) {
      logger.error('Error duplicating course:', error);
      throw error;
    }
  }

  async getCourseStats(courseId: string) {
    try {
      // Get course with modules and files
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select(
          `
          *,
          modules (
            *,
            files (*)
          )
        `
        )
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      // Calculate statistics
      const stats = {
        moduleCount: course.modules?.length || 0,
        totalFiles: 0,
        totalFileSize: 0,
        fileTypes: {} as Record<string, number>,
        processingStatus: {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
        },
        estimatedDuration: 0,
      };

      course.modules?.forEach((module: CourseModule & { files?: CourseFile[] }) => {
        stats.estimatedDuration += module.estimated_duration || 0;

        module.files?.forEach((file: CourseFile) => {
          stats.totalFiles++;
          stats.totalFileSize += file.file_size_bytes || 0;

          // Count file types
          if (file.file_type) {
            stats.fileTypes[file.file_type] = (stats.fileTypes[file.file_type] || 0) + 1;
          }

          // Count processing status
          if (file.status) {
            stats.processingStatus[file.status as keyof typeof stats.processingStatus]++;
          }
        });
      });

      return stats;
    } catch (error) {
      logger.error('Error getting course stats:', error);
      throw error;
    }
  }
}
