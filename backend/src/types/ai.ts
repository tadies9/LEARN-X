export interface AIRequest {
  id: string;
  userId: string;
  requestType: AIRequestType;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  responseTimeMs: number;
  cacheHit: boolean;
  createdAt: Date;
}

export enum AIRequestType {
  EXPLAIN = 'explain',
  SUMMARIZE = 'summarize',
  FLASHCARD = 'flashcard',
  QUIZ = 'quiz',
  ANALOGY = 'analogy',
  EMBEDDING = 'embedding',
}

export interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
}

export interface GenerationParams {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface CachedResponse {
  content: string;
  timestamp: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface ContentFeedback {
  id: string;
  userId: string;
  contentId: string;
  helpful: boolean;
  rating?: number;
  comments?: string;
  createdAt: Date;
}

export interface SearchResult {
  chunkId: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}
