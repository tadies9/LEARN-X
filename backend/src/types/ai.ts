// AI-related type definitions

export type AIRequestType = 
  | 'chat-completion'
  | 'embedding'
  | 'moderation'
  | 'fine-tuning'
  | 'explain'
  | 'summary'
  | 'quiz'
  | 'flashcard'
  | 'practice'
  | 'introduction';

export interface CachedResponse {
  content: string;
  timestamp: number;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
  metadata?: Record<string, any>;
}

export interface AIUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
  cached: boolean;
}

export interface AIRequestLog {
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

export interface AIErrorLog {
  id: string;
  userId: string;
  requestType: AIRequestType;
  error: string;
  errorCode?: string;
  timestamp: Date;
}

export interface BatchProcessingOptions {
  maxBatchSize?: number;
  maxWaitTime?: number;
  priorityGroups?: boolean;
  retryFailures?: boolean;
  costLimit?: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  halfOpenRequests: number;
}

export interface AIResponse {
  content: string;
  usage: AIUsageMetrics;
  cached: boolean;
  metadata?: Record<string, any>;
}

export interface GenerationParams {
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
}

export interface ExplanationParams extends GenerationParams {
  topic: string;
  context?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  style?: 'simple' | 'detailed' | 'academic';
}

export interface SummaryParams extends GenerationParams {
  content: string;
  type?: 'brief' | 'detailed' | 'key-points';
  length?: 'short' | 'medium' | 'long';
}