// Course and module type definitions

export interface Course {
  id: string;
  userId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  isPublic: boolean;
  isArchived: boolean;
  settings?: CourseSettings;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Relations
  modules?: Module[];
  progress?: CourseProgress;
  moduleCount?: number;
  totalDuration?: number;
}

export interface CourseSettings {
  allowDownloads?: boolean;
  allowSharing?: boolean;
  requireSequentialProgress?: boolean;
  aiPersonalizationEnabled?: boolean;
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
  // Relations
  files?: CourseFile[];
  fileCount?: number;
}

export interface CourseFile {
  id: string;
  moduleId: string;
  name: string;
  description?: string;
  fileType: string;
  size: number;
  storagePath: string;
  mimeType: string;
  status: FileProcessingStatus;
  metadata?: FileMetadata;
  processedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  chunks?: FileChunk[];
}

export interface FileMetadata {
  pageCount?: number;
  wordCount?: number;
  language?: string;
  extractedTitle?: string;
  extractedAuthors?: string[];
  extractedDate?: string;
}

export type FileProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface FileChunk {
  id: string;
  fileId: string;
  chunkIndex: number;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CourseProgress {
  id: string;
  userId: string;
  courseId: string;
  moduleId?: string;
  fileId?: string;
  progressPercentage: number;
  lastAccessedAt: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Form types
export interface CreateCourseInput {
  title: string;
  description?: string;
  isPublic?: boolean;
  settings?: CourseSettings;
}

export interface UpdateCourseInput extends Partial<CreateCourseInput> {
  isArchived?: boolean;
}

export interface CreateModuleInput {
  courseId: string;
  title: string;
  description?: string;
  estimatedDuration?: number;
}

export interface UpdateModuleInput extends Partial<Omit<CreateModuleInput, 'courseId'>> {
  position?: number;
  isPublished?: boolean;
}

// File upload types
export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// Filter and sort types
export interface CourseFilters {
  search?: string;
  isPublic?: boolean;
  isArchived?: boolean;
  userId?: string;
}

export interface CourseSortOptions {
  field: 'title' | 'createdAt' | 'updatedAt' | 'moduleCount';
  order: 'asc' | 'desc';
}

// Supported file types
export const SUPPORTED_FILE_TYPES = {
  pdf: {
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    maxSize: 50 * 1024 * 1024, // 50MB
  },
  text: {
    extensions: ['.txt', '.md', '.markdown'],
    mimeTypes: ['text/plain', 'text/markdown'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  document: {
    extensions: ['.doc', '.docx'],
    mimeTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSize: 25 * 1024 * 1024, // 25MB
  },
} as const;

export type SupportedFileType = keyof typeof SUPPORTED_FILE_TYPES;
