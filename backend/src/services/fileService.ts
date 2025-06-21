import { supabase } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';
import { AppError } from '../utils/errors';
import type { CourseFile, CreateFileData, UpdateFileData } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { queueOrchestrator } from './queue/QueueOrchestrator';
import { transformCourseFile, transformCourseFiles } from '../utils/transformers';
import { logger } from '../utils/logger';

// Create a service role client specifically for storage operations
const supabaseServiceRole = (() => {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    // Configuration error should be logged by the application's logging service
  }

  return createClient(url!, serviceKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
})();

export class FileService {
  private bucketName = 'course-files';

  constructor() {
    // Service initialization should be logged by the application's logging service
  }

  async getModuleFiles(moduleId: string, userId: string): Promise<CourseFile[]> {
    // Method invocation should be logged by the application's logging service

    // First verify the user has access to this module
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('id, course_id')
      .eq('id', moduleId)
      .single();

    if (moduleError || !module) {
      // Module errors should be logged by the application's logging service
      throw new AppError('Module not found', 404);
    }

    // Check if user has access to the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, user_id')
      .eq('id', module.course_id)
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .single();

    if (courseError || !course) {
      // Access errors should be logged by the application's logging service
      throw new AppError('Access denied', 403);
    }

    // Access check results should be logged by the application's logging service

    // Get files
    // File fetching should be logged by the application's logging service
    const { data: files, error } = await supabase
      .from('course_files')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at', { ascending: true });

    if (error) {
      // Fetch errors should be logged by the application's logging service
      throw new AppError('Failed to fetch files', 500);
    }

    // File count and details should be logged by the application's logging service

    // Transform snake_case to camelCase for frontend
    const transformedFiles = transformCourseFiles(files || []);
    // Transformation results should be logged by the application's logging service

    return transformedFiles;
  }

  async getFile(fileId: string, userId: string): Promise<CourseFile> {
    // Method invocation should be logged by the application's logging service

    const { data: file, error } = await supabase
      .from('course_files')
      .select(
        `
        *,
        modules!inner(
          id,
          courses!inner(
            id,
            user_id
          )
        )
      `
      )
      .eq('id', fileId)
      .single();

    if (error || !file) {
      // File errors should be logged by the application's logging service
      throw new AppError('File not found', 404);
    }

    // Check access
    const course = (file as any).modules.courses;
    // Access check details should be logged by the application's logging service

    if (course.user_id !== userId) {
      // Access denial should be logged by the application's logging service
      throw new AppError('Access denied', 403);
    }

    return transformCourseFile(file);
  }

  async uploadFile(
    file: Express.Multer.File,
    data: CreateFileData,
    userId: string
  ): Promise<CourseFile> {
    // Method invocation and parameters should be logged by the application's logging service

    // Verify user owns the module's course
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select(
        `
        id,
        courses!inner(
          id,
          user_id
        )
      `
      )
      .eq('id', data.moduleId)
      .single();

    if (moduleError || !module || (module as any).courses.user_id !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Generate unique file path
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${(module as any).courses.id}/${data.moduleId}/${uuidv4()}.${fileExtension}`;

    // Upload to Supabase Storage
    // Storage upload details should be logged by the application's logging service

    const { error: uploadError } = await supabase.storage
      .from(this.bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) {
      // Storage errors should be logged by the application's logging service
      throw new AppError('Failed to upload file: ' + uploadError.message, 500);
    }

    // Get course_id from module
    const courseId = (module as any).courses.id;

    // Create file record
    const { data: newFile, error: createError } = await supabase
      .from('course_files')
      .insert({
        course_id: courseId,
        module_id: data.moduleId,
        name: data.name || file.originalname,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size_bytes: file.size,
        storage_path: fileName,
        status: 'pending',
      })
      .select()
      .single();

    if (createError) {
      // Database errors should be logged by the application's logging service
      // Clean up uploaded file
      await supabase.storage.from(this.bucketName).remove([fileName]);
      throw new AppError('Failed to create file record: ' + createError.message, 500);
    }

    // Queue file for processing using Enhanced PGMQ
    try {
      const msgId = await queueOrchestrator.enqueueFileProcessing(
        newFile.id,
        userId,
        data.processingOptions as Record<string, unknown> | undefined
      );
      // Queue success should be logged by the application's logging service
      logger.info('File processing enqueued', {
        fileId: newFile.id,
        msgId,
        fileName: file.originalname,
        options: data.processingOptions,
      });
    } catch (queueError) {
      // Queue errors should be logged by the application's logging service
      // Don't fail the upload, but log the error
      logger.error('Failed to queue file processing', { fileId: newFile.id, error: queueError });
    }

    return transformCourseFile(newFile);
  }

  async updateFile(fileId: string, data: UpdateFileData, userId: string): Promise<CourseFile> {
    // Verify ownership
    const file = await this.getFile(fileId, userId);

    const { data: module } = await supabase
      .from('modules')
      .select(
        `
        courses!inner(
          user_id
        )
      `
      )
      .eq('id', (file as any).module_id)
      .single();

    if (!module || (module as any).courses.user_id !== userId) {
      throw new AppError('Access denied', 403);
    }

    const { data: updatedFile, error } = await supabase
      .from('course_files')
      .update({
        name: data.name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to update file', 500);
    }

    return transformCourseFile(updatedFile);
  }

  async checkFileOwnership(fileId: string, userId: string): Promise<boolean> {
    try {
      const { data: file, error } = await supabase
        .from('course_files')
        .select(
          `
          id,
          modules!inner(
            courses!inner(
              user_id
            )
          )
        `
        )
        .eq('id', fileId)
        .single();

      if (error || !file) {
        return false;
      }

      const course = (file as any).modules.courses;
      return course.user_id === userId;
    } catch (error) {
      logger.error('Error checking file ownership:', error);
      return false;
    }
  }

  async deleteFile(fileId: string, userId: string): Promise<void> {
    // Method invocation should be logged by the application's logging service

    // Get file with ownership check
    let file;
    try {
      file = await this.getFile(fileId, userId);
      // File retrieval should be logged by the application's logging service
    } catch (error) {
      // File errors should be logged by the application's logging service
      throw error; // Re-throw the error from getFile
    }

    // Since getFile already checks ownership, we don't need to check again
    // The module query here is redundant and might be causing issues
    // Ownership verification should be logged by the application's logging service

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(this.bucketName)
      .remove([(file as any).storage_path]);

    if (storageError) {
      // Storage deletion errors should be logged by the application's logging service
    }

    // Delete record
    const { error } = await supabase.from('course_files').delete().eq('id', fileId);

    if (error) {
      throw new AppError('Failed to delete file', 500);
    }

    // TODO: Implement cleanup job in enhanced PGMQ system
    // await queueOrchestrator.enqueueCleanup(fileId, 'cleanup_file', { fileId });
  }

  async reorderFiles(moduleId: string, fileIds: string[], userId: string): Promise<CourseFile[]> {
    // Verify user owns the module's course
    const { data: module } = await supabase
      .from('modules')
      .select(
        `
        id,
        courses!inner(
          user_id
        )
      `
      )
      .eq('id', moduleId)
      .single();

    if (!module || (module as any).courses.user_id !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Update file positions based on the provided order
    if (fileIds && fileIds.length > 0) {
      for (let i = 0; i < fileIds.length; i++) {
        await supabase
          .from('course_files')
          .update({ position: i + 1 })
          .eq('id', fileIds[i])
          .eq('module_id', moduleId);
      }
    }

    return this.getModuleFiles(moduleId, userId);
  }

  async getSignedUrl(fileId: string, userId: string, expiresIn: number): Promise<string> {
    // Method invocation and parameters should be logged by the application's logging service
    const file = await this.getFile(fileId, userId);
    // File details and signed URL creation should be logged by the application's logging service

    try {
      // Try with service role client first
      const { data, error } = await supabaseServiceRole.storage
        .from(this.bucketName)
        .createSignedUrl(file.storagePath, expiresIn);

      if (!error && data?.signedUrl) {
        // Signed URL success should be logged by the application's logging service
        return data.signedUrl;
      }

      // Service role errors should be logged by the application's logging service
    } catch (serviceError) {
      // Service client errors should be logged by the application's logging service
    }

    // Fallback to regular client
    // Fallback attempt should be logged by the application's logging service
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(file.storagePath, expiresIn);

      if (error || !data) {
        // Regular client errors should be logged by the application's logging service
        throw new AppError(
          'Failed to generate signed URL: ' + (error?.message || 'Unknown error'),
          500
        );
      }

      // Signed URL success should be logged by the application's logging service
      return data.signedUrl;
    } catch (fallbackError) {
      // Complete failure should be logged by the application's logging service
      throw new AppError('Failed to generate signed URL', 500);
    }
  }
}
