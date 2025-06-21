/**
 * API request/response type definitions
 * Standardized interfaces for API communication
 */

// Base API response structure
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

// Paginated response structure
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Search request/response types
export interface SearchRequest {
  query: string;
  fileId?: string;
  userId: string;
  filters?: SearchFilters;
  options?: SearchOptions;
}

export interface SearchFilters {
  contentType?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  fileIds?: string[];
  chunkTypes?: string[];
  importanceLevel?: string[];
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  includeMetadata?: boolean;
  minScore?: number;
  hybridSearch?: boolean;
  semanticWeight?: number;
  keywordWeight?: number;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  fileId: string;
  fileName?: string;
  chunkIndex: number;
  sectionTitle?: string;
  metadata?: Record<string, unknown>;
  highlights?: string[];
  relevanceScore?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  processingTime: number;
  searchType: 'semantic' | 'keyword' | 'hybrid';
  filters?: SearchFilters;
}

// Content generation types
export interface ContentGenerationRequest {
  userId: string;
  type: 'explanation' | 'summary' | 'flashcards' | 'quiz' | 'introduction';
  context?: {
    fileId?: string;
    chunks?: ContentChunk[];
    topic?: string;
    subtopic?: string;
  };
  options?: ContentGenerationOptions;
}

export interface ContentChunk {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  score?: number;
}

export interface ChunkMetadata {
  type?: string;
  importance?: string;
  title?: string;
  level?: number;
  concepts?: string[];
  section?: string;
  hierarchy?: string[];
  [key: string]: unknown;
}

export interface ContentGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  personalizationLevel?: 'low' | 'medium' | 'high' | 'adaptive';
  language?: string;
  includeExamples?: boolean;
  includePractice?: boolean;
  format?: string;
  stream?: boolean;
}

export interface ContentGenerationResponse {
  content: string;
  type: string;
  personalizationScore: number;
  qualityMetrics: QualityMetrics;
  cached: boolean;
  usage?: UsageMetrics;
  metadata?: Record<string, unknown>;
}

export interface QualityMetrics {
  relevance: number;
  clarity: number;
  completeness: number;
  engagement: number;
  accuracy: number;
  personalization: number;
}

export interface UsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
  responseTime: number;
}

// File processing types
export interface FileProcessingRequest {
  fileId: string;
  options?: ProcessingOptions;
}

export interface ProcessingOptions {
  chunkSize?: number;
  priority?: number;
  generateSummary?: boolean;
  extractKeypoints?: boolean;
  generateQuestions?: boolean;
  preserveStructure?: boolean;
  adaptiveSize?: boolean;
  includeMetadata?: boolean;
  overlapSize?: number;
}

export interface FileProcessingResponse {
  fileId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  chunkCount?: number;
  processingTime?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Flashcard types
export interface FlashcardRequest {
  content: string;
  topic: string;
  count?: number;
  userId: string;
  options?: FlashcardOptions;
}

export interface FlashcardOptions {
  contextualExamples?: boolean;
  difficultyMix?: boolean;
  includeDiagrams?: boolean;
  maxLength?: number;
}

export interface FlashcardResult {
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface FlashcardResponse {
  flashcards: FlashcardResult[];
  count: number;
  topic: string;
  metadata?: Record<string, unknown>;
}

// Quiz types
export interface QuizRequest {
  content: string;
  topic: string;
  type?: 'multiple_choice' | 'true_false' | 'short_answer' | 'scenario_analysis';
  count?: number;
  userId: string;
  options?: QuizOptions;
}

export interface QuizOptions {
  adaptiveDifficulty?: boolean;
  includeExplanations?: boolean;
  includeDistractors?: boolean;
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
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

export interface QuizResponse {
  questions: QuizQuestion[];
  count: number;
  topic: string;
  type: string;
  metadata?: Record<string, unknown>;
}

// Streaming response types
export interface StreamingResponse {
  type: 'content' | 'error' | 'complete' | 'metadata';
  data: string | Record<string, unknown>;
  timestamp?: string;
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

// Health check types
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  services?: Record<string, ServiceHealth>;
  uptime?: number;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastCheck?: string;
  error?: string;
}
