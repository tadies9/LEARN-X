/**
 * Python AI Service Client
 * Handles communication with the Python AI service for content generation and embeddings
 */

import { logger } from '../../utils/logger';
// Removed unused import '../../types/ai';
import { UserPersona, PersonaRow } from '../../types/persona';

export interface PythonAIConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  apiKey?: string;
}

export interface ContentGenerationRequest {
  content: string;
  content_type:
    | 'explanation'
    | 'summary'
    | 'quiz'
    | 'flashcards'
    | 'outline'
    | 'examples'
    | 'practice';
  topic?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  persona?: UserPersona | PersonaRow | any; // Allow flexible persona types for PersonaPromptBuilder
  model?: string;
  temperature?: number;
  max_tokens?: number;
  content_metadata?: {
    max_tokens?: number;
    input_length?: number;
    complexity?: number;
    estimated_output?: number;
  };
  stream: boolean;
  user_id?: string;
}

export interface EmbeddingRequest {
  texts: string | string[];
  model?: string;
  dimensions?: number;
  user_id?: string;
}

export interface BatchEmbeddingRequest {
  items: Array<{
    id?: string;
    text: string;
    metadata?: Record<string, unknown>;
  }>;
  model?: string;
  dimensions?: number;
  batch_size?: number;
  user_id?: string;
}

export interface CompletionRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  stream: boolean;
  user_id?: string;
  preferred_providers?: string[];
}

export interface StreamingChunk {
  content?: string;
  type?: string;
  done?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export class PythonAIClient {
  private config: PythonAIConfig;

  constructor(config: Partial<PythonAIConfig> = {}) {
    this.config = {
      baseUrl: process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8001',
      timeout: 60000,
      maxRetries: 3,
      ...config,
    };
  }

  /**
   * Generate content with streaming support
   */
  async *generateContent(
    request: ContentGenerationRequest
  ): AsyncGenerator<StreamingChunk, void, unknown> {
    const url = `${this.config.baseUrl}/api/v1/ai/generate-content`;

    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (request.stream) {
        yield* this.parseStreamingResponse(response);
      } else {
        const data = (await response.json()) as { content: string };
        yield {
          content: data.content,
          type: request.content_type,
          done: true,
        };
      }
    } catch (error) {
      logger.error('Python AI content generation error:', error);
      yield {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create embeddings for text(s)
   */
  async createEmbeddings(request: EmbeddingRequest): Promise<{
    embeddings: number[][];
    model: string;
    usage: Record<string, number>;
  }> {
    const url = `${this.config.baseUrl}/api/v1/ai/embeddings`;

    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as {
        embeddings: number[][];
        model: string;
        usage: Record<string, number>;
      };
    } catch (error) {
      logger.error('Python AI embedding error:', error);
      throw error;
    }
  }

  /**
   * Create batch embeddings with optimization
   */
  async createBatchEmbeddings(request: BatchEmbeddingRequest): Promise<{
    embeddings: Array<{
      id: string;
      embedding: number[];
      metadata: Record<string, unknown>;
    }>;
    model: string;
    total_items: number;
  }> {
    const url = `${this.config.baseUrl}/api/v1/ai/embeddings/batch`;

    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as {
        embeddings: Array<{
          id: string;
          embedding: number[];
          metadata: Record<string, unknown>;
        }>;
        model: string;
        total_items: number;
      };
    } catch (error) {
      logger.error('Python AI batch embedding error:', error);
      throw error;
    }
  }

  /**
   * Generate completions with provider fallback
   */
  async *complete(request: CompletionRequest): AsyncGenerator<StreamingChunk, void, unknown> {
    const url = `${this.config.baseUrl}/api/v1/ai/complete`;

    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (request.stream) {
        yield* this.parseStreamingResponse(response);
      } else {
        const data = (await response.json()) as {
          content: string;
          model: string;
          usage: Record<string, number>;
        };
        yield {
          content: data.content,
          done: true,
          metadata: {
            model: data.model,
            usage: data.usage,
          },
        };
      }
    } catch (error) {
      logger.error('Python AI completion error:', error);
      yield {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get available models and their capabilities
   */
  async getModels(): Promise<
    Record<
      string,
      {
        id: string;
        name: string;
        description?: string;
        capabilities?: string[];
        pricing?: Record<string, number>;
      }
    >
  > {
    const url = `${this.config.baseUrl}/api/v1/ai/models`;

    try {
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: {
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as Record<
        string,
        {
          id: string;
          name: string;
          description?: string;
          capabilities?: string[];
          pricing?: Record<string, number>;
        }
      >;
    } catch (error) {
      logger.error('Python AI models error:', error);
      throw error;
    }
  }

  /**
   * Get AI service statistics
   */
  async getStats(): Promise<
    Record<
      string,
      {
        total_requests?: number;
        total_tokens?: number;
        cache_hits?: number;
        cache_misses?: number;
        average_latency?: number;
        error_rate?: number;
        [key: string]: unknown;
      }
    >
  > {
    const url = `${this.config.baseUrl}/api/v1/ai/stats`;

    try {
      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: {
          ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as Record<
        string,
        {
          total_requests?: number;
          total_tokens?: number;
          cache_hits?: number;
          cache_misses?: number;
          average_latency?: number;
          error_rate?: number;
          [key: string]: unknown;
        }
      >;
    } catch (error) {
      logger.error('Python AI stats error:', error);
      throw error;
    }
  }

  /**
   * Health check for the Python AI service
   */
  async healthCheck(): Promise<boolean> {
    const url = `${this.config.baseUrl}/api/v1/health`;

    try {
      const response = await this.makeRequest(url, {
        method: 'GET',
        timeout: 5000, // Shorter timeout for health checks
      });

      return response.ok;
    } catch (error) {
      logger.warn('Python AI service health check failed:', error);
      return false;
    }
  }

  /**
   * Parse streaming response from Python service
   */
  private async *parseStreamingResponse(
    response: Response
  ): AsyncGenerator<StreamingChunk, void, unknown> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No readable stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              return;
            }

            try {
              const chunk = JSON.parse(data);
              yield chunk;
            } catch (error) {
              // Non-JSON line, treat as raw content
              yield { content: data };
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(
    url: string,
    options: RequestInit & { timeout?: number }
  ): Promise<Response> {
    const { timeout = this.config.timeout, ...fetchOptions } = options;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        if (attempt === this.config.maxRetries) {
          throw error;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));

        logger.warn(`Python AI request retry ${attempt}/${this.config.maxRetries}`, {
          url,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    throw new Error('All retry attempts failed');
  }
}

// Singleton instance
export const pythonAIClient = new PythonAIClient();
