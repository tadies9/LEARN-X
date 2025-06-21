/**
 * Database Types
 * Type definitions for database entities
 */

export interface FileChunk {
  id: string;
  file_id: string;
  content: string;
  chunk_index: number;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CourseFile {
  id: string;
  course_id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  chunks?: FileChunk[];
  created_at: string;
  updated_at: string;
}

export interface GenerationTask {
  jobId: string;
  fileId: string;
  outputType: string;
  userId: string;
  courseId: string;
  personaId?: string;
  options: Record<string, unknown>;
}

export interface GenerationResult {
  id: string;
  job_id: string;
  file_id: string;
  output_type: string;
  result: GenerationResultData;
  created_at: string;
}

export interface GenerationResultData {
  flashcards?: Flashcard[];
  summary?: string;
  questions?: QuizQuestion[];
  outline?: OutlineItem[];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface OutlineItem {
  title: string;
  level: number;
  content: string;
  children?: OutlineItem[];
}