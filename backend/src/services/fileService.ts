import { supabase } from '../config/supabase';
import { AppError } from '../utils/errors';
import type { CourseFile, CreateFileData, UpdateFileData } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { fileProcessingQueue } from '../config/queue';

export class FileService {
  private bucketName = 'course-files';

  async getModuleFiles(moduleId: string, userId: string): Promise<CourseFile[]> {
    // First verify the user has access to this module
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('id, course_id')
      .eq('id', moduleId)
      .single();

    if (moduleError || !module) {
      throw new AppError('Module not found', 404);
    }

    // Check if user has access to the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', module.course_id)
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .single();

    if (courseError || !course) {
      throw new AppError('Access denied', 403);
    }

    // Get files
    const { data: files, error } = await supabase
      .from('course_files')
      .select('*')
      .eq('module_id', moduleId)
      .order('position', { ascending: true });

    if (error) {
      throw new AppError('Failed to fetch files', 500);
    }

    return files || [];
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
            user_id,
            is_public
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
    if (course.user_id !== userId && !course.is_public) {
      throw new AppError('Access denied', 403);
    }

    return file;
  }

  async uploadFile(
    file: Express.Multer.File,
    data: CreateFileData,
    userId: string
  ): Promise<CourseFile> {
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
    const { error: uploadError } = await supabase.storage
      .from(this.bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) {
      throw new AppError('Failed to upload file', 500);
    }

    // Get the next position
    const { data: lastFile } = await supabase
      .from('course_files')
      .select('position')
      .eq('module_id', data.moduleId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const position = lastFile ? lastFile.position + 1 : 1;

    // Create file record
    const { data: newFile, error: createError } = await supabase
      .from('course_files')
      .insert({
        module_id: data.moduleId,
        name: data.name || file.originalname,
        description: data.description,
        file_path: fileName,
        mime_type: file.mimetype,
        size: file.size,
        position,
        status: 'uploaded',
        processing_options: data.processingOptions,
      })
      .select()
      .single();

    if (createError) {
      // Clean up uploaded file
      await supabase.storage.from(this.bucketName).remove([fileName]);
      throw new AppError('Failed to create file record', 500);
    }

    // Queue file for processing
    await fileProcessingQueue.add('process-file', {
      fileId: newFile.id,
      userId,
      processingOptions: data.processingOptions,
    });

    return newFile;
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
      .eq('id', file.moduleId)
      .single();

    if (!module || (module as any).courses.user_id !== userId) {
      throw new AppError('Access denied', 403);
    }

    const { data: updatedFile, error } = await supabase
      .from('course_files')
      .update({
        name: data.name,
        description: data.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to update file', 500);
    }

    return updatedFile;
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
      .eq('id', file.moduleId)
      .single();

    if (!module || (module as any).courses.user_id !== userId) {
      throw new AppError('Access denied', 403);
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(this.bucketName)
      .remove([file.filePath]);

    if (storageError) {
      console.error('Failed to delete file from storage:', storageError);
    }

    // Delete record
    const { error } = await supabase.from('course_files').delete().eq('id', fileId);

    if (error) {
      throw new AppError('Failed to delete file', 500);
    }

    // Update positions
    await supabase.rpc('update_file_positions', {
      p_module_id: file.moduleId,
      p_deleted_position: file.position,
    });

    // Queue cleanup job
    await fileProcessingQueue.add('cleanup-file', { fileId });
  }

  async reorderFiles(moduleId: string, fileIds: string[], userId: string): Promise<CourseFile[]> {
    // Verify ownership
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

    // Update positions
    const updates = fileIds.map((fileId, index) => ({
      id: fileId,
      position: index + 1,
      updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
      await supabase
        .from('course_files')
        .update({
          position: update.position,
          updated_at: update.updated_at,
        })
        .eq('id', update.id)
        .eq('module_id', moduleId);
    }

    return this.getModuleFiles(moduleId, userId);
  }

  async getSignedUrl(fileId: string, userId: string, expiresIn: number): Promise<string> {
    const file = await this.getFile(fileId, userId);

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUrl(file.filePath, expiresIn);

    if (error || !data) {
      throw new AppError('Failed to generate signed URL', 500);
    }

    return data.signedUrl;
  }
}
