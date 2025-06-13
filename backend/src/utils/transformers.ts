// Transform snake_case database fields to camelCase for frontend
export function transformCourseFile(file: any): any {
  if (!file) return null;
  
  return {
    id: file.id,
    courseId: file.course_id,
    moduleId: file.module_id,
    name: file.name,
    originalName: file.original_name,
    size: file.size_bytes,
    storagePath: file.storage_path,
    mimeType: file.mime_type,
    status: file.status,
    metadata: file.metadata || {},
    processedAt: file.processed_at,
    errorMessage: file.processing_error,
    createdAt: file.created_at,
    updatedAt: file.updated_at,
    description: file.description,
  };
}

export function transformCourseFiles(files: any[]): any[] {
  return files.map(transformCourseFile);
}