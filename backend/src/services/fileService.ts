import { supabase } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';
import { AppError } from '../utils/errors';
import type { CourseFile, CreateFileData, UpdateFileData } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { FILE_PROCESSING_QUEUE } from '../config/queue';
import { transformCourseFile, transformCourseFiles } from '../utils/transformers';

// Create a service role client specifically for storage operations
const supabaseServiceRole = (() => {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing Supabase configuration:', {
      hasUrl: !!url,
      hasServiceKey: !!serviceKey,
      envKeys: Object.keys(process.env).filter((k) => k.includes('SUPABASE')),
    });
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
    console.log('FileService initialized with bucket:', this.bucketName);
  }

  async getModuleFiles(moduleId: string, userId: string): Promise<CourseFile[]> {
    console.log('=== getModuleFiles called ===');
    console.log('Module ID:', moduleId);
    console.log('User ID:', userId);

    // First verify the user has access to this module
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('id, course_id')
      .eq('id', moduleId)
      .single();

    if (moduleError || !module) {
      console.error('Module not found:', moduleError);
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
      console.error('Access denied:', courseError);
      throw new AppError('Access denied', 403);
    }

    console.log('Access check passed - Course owner:', course.user_id, 'Current user:', userId);

    // Get files
    console.log('Fetching files for module:', moduleId);
    const { data: files, error } = await supabase
      .from('course_files')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch files:', error);
      throw new AppError('Failed to fetch files', 500);
    }

    console.log(`Found ${files?.length || 0} files for module ${moduleId}`);
    console.log('Files:', files);

    // Transform snake_case to camelCase for frontend
    const transformedFiles = transformCourseFiles(files || []);
    console.log('Transformed files:', transformedFiles);

    return transformedFiles;
  }

  async getFile(fileId: string, userId: string): Promise<CourseFile> {
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
      throw new AppError('File not found', 404);
    }

    // Check access
    const course = (file as any).modules.courses;
    if (course.user_id !== userId) {
      throw new AppError('Access denied', 403);
    }

    return transformCourseFile(file);
  }

  async uploadFile(
    file: Express.Multer.File,
    data: CreateFileData,
    userId: string
  ): Promise<CourseFile> {
    console.log('=== FileService.uploadFile called ===');
    console.log(
      'File:',
      file ? { name: file.originalname, size: file.size, mimetype: file.mimetype } : 'NO FILE'
    );
    console.log('Data:', data);
    console.log('UserId:', userId);

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
    console.log('Uploading file to storage:', {
      bucket: this.bucketName,
      fileName,
      size: file.size,
      mimetype: file.mimetype,
    });

    const { error: uploadError } = await supabase.storage
      .from(this.bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
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
      console.error('Database error creating file record:', createError);
      console.error('Attempted to insert:', {
        course_id: courseId,
        module_id: data.moduleId,
        name: data.name || file.originalname,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size_bytes: file.size,
        storage_path: fileName,
        status: 'pending',
      });
      // Clean up uploaded file
      await supabase.storage.from(this.bucketName).remove([fileName]);
      throw new AppError('Failed to create file record: ' + createError.message, 500);
    }

    // Queue file for processing
    await FILE_PROCESSING_QUEUE.add('process-file', {
      fileId: newFile.id,
      userId,
      processingOptions: data.processingOptions,
    });

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

  async deleteFile(fileId: string, userId: string): Promise<void> {
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

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(this.bucketName)
      .remove([(file as any).storage_path]);

    if (storageError) {
      console.error('Failed to delete file from storage:', storageError);
    }

    // Delete record
    const { error } = await supabase.from('course_files').delete().eq('id', fileId);

    if (error) {
      throw new AppError('Failed to delete file', 500);
    }

    // Queue cleanup job
    await FILE_PROCESSING_QUEUE.add('cleanup-file', { fileId });
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
    console.log('=== FileService.getSignedUrl ===');
    console.log('File ID:', fileId);
    console.log('User ID:', userId);
    console.log('Expires in:', expiresIn);

    console.log('Getting file details...');
    const file = await this.getFile(fileId, userId);
    console.log('File found:', {
      id: file.id,
      name: file.name,
      storage_path: file.storagePath,
    });

    console.log('Creating signed URL with Supabase service role client...');

    try {
      // Try with service role client first
      const { data, error } = await supabaseServiceRole.storage
        .from(this.bucketName)
        .createSignedUrl(file.storagePath, expiresIn);

      if (!error && data?.signedUrl) {
        console.log('Signed URL created successfully with service role');
        return data.signedUrl;
      }

      console.error('Service role signed URL error:', error);
    } catch (serviceError) {
      console.error('Service role client error:', serviceError);
    }

    // Fallback to regular client
    console.log('Trying with regular supabase client...');
    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(file.storagePath, expiresIn);

      if (error || !data) {
        console.error('Regular client signed URL error:', error);
        throw new AppError(
          'Failed to generate signed URL: ' + (error?.message || 'Unknown error'),
          500
        );
      }

      console.log('Signed URL created successfully with regular client');
      return data.signedUrl;
    } catch (fallbackError) {
      console.error('All attempts to create signed URL failed:', fallbackError);
      throw new AppError('Failed to generate signed URL', 500);
    }
  }
}
