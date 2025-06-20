/**
 * Frontend API type definitions
 * Interfaces for API communication and responses
 */

// Base types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    requestId?: string;
    timestamp?: string;
    version?: string;
  };
}

// Content generation types
export interface FlashcardResult {
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface QuizQuestion {
  id?: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'scenario_analysis';
  options?: string[] | Record<string, string>;
  answer: string;
  explanation: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface SummaryResult {
  summary: string;
  keyPoints?: string[];
  format: 'key-points' | 'comprehensive' | 'visual-map';
  metadata?: Record<string, unknown>;
}

// Streaming response types
export interface StreamingMessage {
  type: 'content' | 'error' | 'complete' | 'metadata';
  data: string | Record<string, unknown>;
  timestamp?: string;
}

// API request parameters
export interface ExplanationRequest {
  fileId?: string;
  topicId: string;
  subtopic: string;
  mode: string;
  token: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
    personalizationLevel?: string;
  };
}

export interface SummaryRequest {
  fileId: string;
  format: 'key-points' | 'comprehensive' | 'visual-map';
  options?: {
    maxLength?: number;
    includeExamples?: boolean;
  };
}

export interface FlashcardRequest {
  fileId: string;
  chunkIds: string[];
  count?: number;
  options?: {
    difficultyMix?: boolean;
    includeImages?: boolean;
  };
}

export interface QuizRequest {
  fileId: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  chunkIds: string[];
  count?: number;
  options?: {
    difficulty?: 'easy' | 'medium' | 'hard';
    includeExplanations?: boolean;
  };
}

// Response types
export interface FlashcardResponse {
  flashcards: FlashcardResult[];
  count: number;
  metadata?: Record<string, unknown>;
}

export interface QuizResponse {
  questions: QuizQuestion[];
  count: number;
  metadata?: Record<string, unknown>;
}

// Error types
export interface APIError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
  timestamp?: string;
  requestId?: string;
}

// Cache types
export interface CacheOptions {
  userId: string;
  fileId: string;
  topicId: string;
  subtopic: string;
  mode: string;
  version: string;
  persona?: UserPersona;
}

export interface UserPersona {
  id: string;
  learning_style: string;
  experience_level: string;
  interests: string[];
  goals: string[];
  preferences: Record<string, unknown>;
}