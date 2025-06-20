import { logger } from '../../utils/logger';
import { AIResponse } from '../../types/ai';

interface ErrorWithResponse {
  response?: {
    status: number;
    data?: {
      error?: {
        message?: string;
      };
    };
    headers?: {
      'retry-after'?: string;
    };
  };
  message?: string;
  code?: string;
}

export class AIErrorHandler {
  handle(error: ErrorWithResponse | Error | unknown): AIResponse {
    logger.error('AI Service Error:', error);

    // OpenAI specific errors
    if ((error as ErrorWithResponse)?.response?.status) {
      const errorWithResponse = error as ErrorWithResponse;
      switch (errorWithResponse.response!.status) {
        case 401:
          return {
            success: false,
            error: 'AI service authentication failed. Please contact support.',
          };

        case 429:
          return {
            success: false,
            error: 'Too many requests. Please try again in a moment.',
          };

        case 500:
        case 502:
        case 503:
          return {
            success: false,
            error: 'AI service temporarily unavailable. Please try again.',
          };

        case 400:
          if (
            errorWithResponse.response!.data?.error?.message?.includes('context_length_exceeded')
          ) {
            return {
              success: false,
              error: 'Content too long for processing. Please try with shorter content.',
            };
          }
          return {
            success: false,
            error: 'Invalid request to AI service.',
          };

        default:
          return {
            success: false,
            error: 'An unexpected error occurred with the AI service.',
          };
      }
    }

    // Rate limit errors
    if ((error as Error)?.message?.includes('rate limit')) {
      return {
        success: false,
        error: 'Rate limit reached. Please wait a moment before trying again.',
      };
    }

    // Budget errors
    if (
      (error as Error)?.message?.includes('budget') ||
      (error as Error)?.message?.includes('limit exceeded')
    ) {
      return {
        success: false,
        error: 'Daily usage limit reached. Please try again tomorrow.',
      };
    }

    // Network errors
    if (
      (error as ErrorWithResponse)?.code === 'ECONNREFUSED' ||
      (error as ErrorWithResponse)?.code === 'ETIMEDOUT'
    ) {
      return {
        success: false,
        error: 'Unable to connect to AI service. Please check your connection.',
      };
    }

    // Default error
    return {
      success: false,
      error: 'Something went wrong. Please try again later.',
    };
  }

  async handleWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error;

        // Don't retry on certain errors
        if (
          (error as ErrorWithResponse)?.response?.status === 401 || // Auth errors
          (error as ErrorWithResponse)?.response?.status === 400 || // Bad requests
          (error as Error)?.message?.includes('budget') // Budget errors
        ) {
          throw error;
        }

        // Log retry attempt
        logger.warn(
          `AI operation failed (attempt ${attempt}/${maxRetries}):`,
          (error as Error)?.message || 'Unknown error'
        );

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay * attempt));
        }
      }
    }

    throw lastError;
  }

  isRetryableError(error: ErrorWithResponse | Error | unknown): boolean {
    // OpenAI errors that are retryable
    if ((error as ErrorWithResponse)?.response?.status) {
      return [429, 500, 502, 503, 504].includes((error as ErrorWithResponse).response!.status);
    }

    // Network errors are retryable
    if (
      (error as ErrorWithResponse)?.code === 'ECONNREFUSED' ||
      (error as ErrorWithResponse)?.code === 'ETIMEDOUT'
    ) {
      return true;
    }

    // Rate limit errors are retryable after delay
    if ((error as Error)?.message?.includes('rate limit')) {
      return true;
    }

    return false;
  }

  getRetryDelay(error: ErrorWithResponse | Error | unknown, attempt: number): number {
    // Check for Retry-After header
    const retryAfter = (error as ErrorWithResponse)?.response?.headers?.['retry-after'];
    if (retryAfter) {
      return parseInt(retryAfter) * 1000;
    }

    // Rate limit errors - wait longer
    if ((error as ErrorWithResponse)?.response?.status === 429) {
      return Math.min(60000, 1000 * Math.pow(2, attempt)); // Max 60s
    }

    // Default exponential backoff
    return Math.min(10000, 1000 * attempt); // Max 10s
  }
}

export const aiErrorHandler = new AIErrorHandler();
