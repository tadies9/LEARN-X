export interface Course {
  id: string;
  userId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  isPublic: boolean;
  isArchived: boolean;
  settings?: CourseSettings;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  modules?: Module[];
  progress?: CourseProgress;
  moduleCount?: number;
  totalDuration?: number;
}

export interface CourseSettings {
  aiPersonalizationEnabled?: boolean;
  allowDownloads?: boolean;
  requireSequentialProgress?: boolean;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  position: number;
  isPublished: boolean;
  estimatedDuration?: number;
  createdAt: string;
  updatedAt: string;
  files?: CourseFile[];
  fileCount?: number;
}

export interface CourseFile {
  id: string;
  moduleId: string;
  name: string;
  description?: string;
  filePath: string;
  mimeType: string;
  size: number;
  position: number;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  processingOptions?: ProcessingOptions;
  chunks?: FileChunk[];
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingOptions {
  generateSummary?: boolean;
  extractKeypoints?: boolean;
  generateQuestions?: boolean;
  chunkSize?: number;
}

export interface FileChunk {
  id: string;
  fileId: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
  position: number;
  createdAt: string;
}

export interface CourseProgress {
  id: string;
  userId: string;
  courseId: string;
  completedModules: string[];
  completedFiles: string[];
  lastAccessedAt: string;
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
}

// Request/Response types
export interface CreateCourseData {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
  settings?: CourseSettings;
}

export interface UpdateCourseData {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
  settings?: CourseSettings;
}

export interface CreateModuleData {
  courseId: string;
  title: string;
  description?: string;
  estimatedDuration?: number;
}

export interface UpdateModuleData {
  title?: string;
  description?: string;
  estimatedDuration?: number;
}

export interface CreateFileData {
  moduleId: string;
  name?: string;
  description?: string;
  processingOptions?: ProcessingOptions;
}

export interface UpdateFileData {
  name?: string;
  description?: string;
}

export interface CourseFilters {
  search?: string;
  isArchived?: boolean;
  isPublic?: boolean;
  userIdOrPublic?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}
