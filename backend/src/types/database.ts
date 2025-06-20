/**
 * Database model type definitions
 * Comprehensive interfaces for database tables and relationships
 */

// Base interface for database records
export interface BaseRecord {
  id: string;
  created_at: string;
  updated_at: string;
}

// Course file database model
export interface CourseFileRecord extends BaseRecord {
  module_id: string;
  name: string;
  original_name: string;
  size_bytes: number;
  storage_path: string;
  mime_type: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  metadata?: Record<string, unknown>;
  processed_at?: string;
  processing_error?: string;
  description?: string;
}

// File chunk database model
export interface FileChunkRecord extends BaseRecord {
  file_id: string;
  chunk_index: number;
  content: string;
  content_length: number;
  chunk_type: string;
  importance: string;
  section_title?: string;
  hierarchy_level: number;
  concepts: string[];
  metadata?: Record<string, unknown>;
  embedding?: number[];
}

// Module database model
export interface ModuleRecord extends BaseRecord {
  course_id: string;
  title: string;
  description?: string;
  position: number;
  is_published: boolean;
  estimated_duration?: number;
}

// Course database model
export interface CourseRecord extends BaseRecord {
  user_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  is_public: boolean;
  is_archived: boolean;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Join types for complex queries
export interface CourseFileWithModule extends CourseFileRecord {
  modules: {
    id: string;
    title: string;
    courses: {
      id: string;
      title: string;
      user_id: string;
    };
  };
}

export interface FileChunkWithEmbedding extends FileChunkRecord {
  similarity_score?: number;
  relevance_score?: number;
}

// Search result types
export interface SearchResultRecord {
  chunk_id: string;
  file_id: string;
  content: string;
  similarity_score: number;
  metadata?: Record<string, unknown>;
  file_name?: string;
  section_title?: string;
}

// User persona database model
export interface UserPersonaRecord extends BaseRecord {
  user_id: string;
  learning_style: string;
  experience_level: string;
  interests: string[];
  goals: string[];
  preferences: Record<string, unknown>;
  adaptation_data: Record<string, unknown>;
}

// Queue job types
export interface QueueJobRecord<T = Record<string, unknown>> {
  msg_id: number;
  message: T;
  enqueued_at: string;
  read_ct: number;
  vt: string;
}

// Metrics and analytics types
export interface UsageMetricRecord extends BaseRecord {
  user_id: string;
  request_type: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
  response_time_ms: number;
  cache_hit: boolean;
}

export interface ErrorLogRecord extends BaseRecord {
  user_id: string;
  error_type: string;
  error_message: string;
  error_code?: string;
  stack_trace?: string;
  context?: Record<string, unknown>;
}