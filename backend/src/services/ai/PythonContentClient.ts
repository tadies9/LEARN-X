/**
 * Python Content Generation Client
 * Replaces Node.js content generation with Python service calls
 */

import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { CircuitBreaker } from './CircuitBreaker';
// Removed unused import '../../types/persona';

export interface ContentChunk {
  id: string;
  content: string;
  metadata: Record<string, any>;
  score?: number;
}

export interface GenerationParams {
  user_id: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  use_cache?: boolean;
  personalization_level?: 'low' | 'medium' | 'high' | 'adaptive';
  language?: string;
  include_examples?: boolean;
  include_practice?: boolean;
  stream?: boolean;
}

export interface ExplanationParams extends GenerationParams {
  chunks: ContentChunk[];
  topic: string;
  subtopic?: string;
  current_level?: 'foundation' | 'intermediate' | 'advanced';
  progressive?: boolean;
}

export interface SummaryParams extends GenerationParams {
  content: string;
  format?: 'key-points' | 'comprehensive' | 'visual-map';
  purpose?: 'review' | 'application' | 'next-steps' | 'connections';
}

export interface FlashcardParams extends GenerationParams {
  content: string;
  topic: string;
  count?: number;
  contextual_examples?: boolean;
  difficulty_mix?: boolean;
}

export interface QuizParams extends GenerationParams {
  content: string;
  topic: string;
  quiz_type?: 'multiple_choice' | 'true_false' | 'short_answer' | 'scenario_analysis';
  count?: number;
  adaptive_difficulty?: boolean;
  include_explanations?: boolean;
}

export interface ChatParams extends GenerationParams {
  message: string;
  context: string[];
  current_page?: number;
  selected_text?: string;
  conversation_history?: Array<{ role: string; content: string }>;
}

export interface PersonalizedContent {
  content: string;
  personalization_score: number;
  quality_metrics: Record<string, number>;
  cached: boolean;
  cost_info?: Record<string, any>;
}

export interface FlashcardResult {
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizQuestion {
  question: string;
  type: string;
  options?: Record<string, string>;
  answer: string;
  explanation: string;
  difficulty?: string;
}

export class PythonContentClient extends EventEmitter {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private readonly baseURL: string;

  constructor(baseURL?: string) {
    super();
    
    this.baseURL = baseURL || process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8001';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000, // 60 seconds
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker('python-content-service', {
      failureThreshold: 5,
      resetTimeout: 30000,
    });


    // Add request/response interceptors
    this.setupInterceptors();
  }

  /**
   * Generate streaming explanation
   */
  async *generateExplanationStream(params: ExplanationParams): AsyncGenerator<string> {
    const startTime = Date.now();
    
    try {
      const response = await this.circuitBreaker.execute(async () => {
        return this.client.post('/content/explanation/stream', params, {
          responseType: 'stream',
          headers: {
            'Accept': 'text/plain',
          },
        });
      });

      // Handle streaming response
      let buffer = '';
      const stream = response.data;

      for await (const chunk of this.streamAsyncIterator(stream)) {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            // Handle Server-Sent Events format
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                return;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  yield parsed.content;
                }
              } catch {
                // If not JSON, treat as plain text
                yield data;
              }
            } else {
              yield line;
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        yield buffer;
      }

      // Track usage
      this.emit('usage', {
        type: 'explanation',
        userId: params.user_id,
        responseTime: Date.now() - startTime,
      });

    } catch (error) {
      logger.error('Failed to generate explanation stream:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Generate summary
   */
  async generateSummary(params: SummaryParams): Promise<PersonalizedContent> {
    const startTime = Date.now();
    
    try {
      const response = await this.circuitBreaker.execute(async () => {
        return this.client.post('/content/summary', params);
      });

      this.emit('usage', {
        type: 'summary',
        userId: params.user_id,
        responseTime: Date.now() - startTime,
      });

      return response.data;

    } catch (error) {
      logger.error('Failed to generate summary:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Generate flashcards
   */
  async generateFlashcards(params: FlashcardParams): Promise<FlashcardResult[]> {
    const startTime = Date.now();
    
    try {
      const response = await this.circuitBreaker.execute(async () => {
        return this.client.post('/content/flashcards', params);
      });

      this.emit('usage', {
        type: 'flashcards',
        userId: params.user_id,
        responseTime: Date.now() - startTime,
      });

      return response.data.flashcards || response.data;

    } catch (error) {
      logger.error('Failed to generate flashcards:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Generate quiz questions
   */
  async generateQuiz(params: QuizParams): Promise<QuizQuestion[]> {
    const startTime = Date.now();
    
    try {
      const response = await this.circuitBreaker.execute(async () => {
        return this.client.post('/content/quiz', params);
      });

      this.emit('usage', {
        type: 'quiz',
        userId: params.user_id,
        responseTime: Date.now() - startTime,
      });

      return response.data.questions || response.data;

    } catch (error) {
      logger.error('Failed to generate quiz:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Stream chat response
   */
  async *streamChatResponse(params: ChatParams): AsyncGenerator<string> {
    const startTime = Date.now();
    
    try {
      const response = await this.circuitBreaker.execute(async () => {
        return this.client.post('/content/chat/stream', params, {
          responseType: 'stream',
          headers: {
            'Accept': 'text/plain',
          },
        });
      });

      // Handle streaming response similar to explanation
      let buffer = '';
      const stream = response.data;

      for await (const chunk of this.streamAsyncIterator(stream)) {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                return;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  yield parsed.content;
                }
              } catch {
                yield data;
              }
            } else {
              yield line;
            }
          }
        }
      }

      if (buffer.trim()) {
        yield buffer;
      }

      this.emit('usage', {
        type: 'chat',
        userId: params.user_id,
        responseTime: Date.now() - startTime,
      });

    } catch (error) {
      logger.error('Failed to stream chat response:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Generate personalized introduction
   */
  async generateIntroduction(
    topic: string,
    content: string,
    userId: string,
    model?: string
  ): Promise<PersonalizedContent> {
    const startTime = Date.now();
    
    try {
      const response = await this.circuitBreaker.execute(async () => {
        return this.client.post('/content/introduction', {
          topic,
          content,
          user_id: userId,
          model,
        });
      });

      this.emit('usage', {
        type: 'introduction',
        userId,
        responseTime: Date.now() - startTime,
      });

      return response.data;

    } catch (error) {
      logger.error('Failed to generate introduction:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Generate personalized examples
   */
  async generateExamples(
    concept: string,
    userId: string,
    count: number = 3,
    model?: string
  ): Promise<string[]> {
    const startTime = Date.now();
    
    try {
      const response = await this.circuitBreaker.execute(async () => {
        return this.client.post('/content/examples', {
          concept,
          user_id: userId,
          count,
          model,
        });
      });

      this.emit('usage', {
        type: 'examples',
        userId,
        responseTime: Date.now() - startTime,
      });

      return response.data.examples || response.data;

    } catch (error) {
      logger.error('Failed to generate examples:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update user persona
   */
  async updatePersona(userId: string, updates: Record<string, any>): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        return this.client.put(`/persona/${userId}`, updates);
      });

      this.emit('persona-updated', { userId, updates });

    } catch (error) {
      logger.error('Failed to update persona:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get personalization score for content
   */
  async getPersonalizationScore(
    userId: string,
    content: string,
    contentType: string
  ): Promise<Record<string, number>> {
    try {
      const response = await this.circuitBreaker.execute(async () => {
        return this.client.post('/persona/score', {
          user_id: userId,
          content,
          content_type: contentType,
        });
      });

      return response.data;

    } catch (error) {
      logger.error('Failed to get personalization score:', error);
      return { overall: 0.0 };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      logger.error('Python service health check failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get service metrics
   */
  async getMetrics(): Promise<Record<string, any>> {
    try {
      const response = await this.client.get('/metrics');
      return response.data;
    } catch (error) {
      logger.error('Failed to get service metrics:', error);
      return {};
    }
  }

  // Private helper methods
  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`Python service request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Python service request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Python service response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('Python service response error:', error);
        return Promise.reject(error);
      }
    );
  }

  private async *streamAsyncIterator(stream: any): AsyncGenerator<string> {
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];
      
      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk.toString());
      });
      
      stream.on('end', () => {
        resolve(chunks.join(''));
      });
      
      stream.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  private handleError(error: any): Error {
    if (error.response) {
      // HTTP error response
      const message = error.response.data?.message || error.response.statusText;
      const statusCode = error.response.status;
      
      return new Error(`Python service error (${statusCode}): ${message}`);
    } else if (error.request) {
      // Network error
      return new Error('Python service network error: Unable to connect');
    } else {
      // Other error
      return new Error(`Python service error: ${error.message}`);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      // Close any open connections
      this.removeAllListeners();
      logger.info('Python content client shutdown complete');
    } catch (error) {
      logger.error('Error during Python content client shutdown:', error);
    }
  }
}

// Export singleton instance
export const pythonContentClient = new PythonContentClient();