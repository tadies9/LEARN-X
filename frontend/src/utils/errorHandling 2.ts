// Error handling utilities for consistent error processing across the app

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: Record<string, any>;
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Standardizes error messages from various sources
 */
export function standardizeError(error: unknown): AppError {
  if (error instanceof Error) {
    return error as AppError;
  }

  if (typeof error === 'string') {
    return new Error(error) as AppError;
  }

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as any;
    const message = errorObj.message || errorObj.error || 'An unexpected error occurred';
    const appError = new Error(message) as AppError;
    
    if (errorObj.code) appError.code = errorObj.code;
    if (errorObj.statusCode) appError.statusCode = errorObj.statusCode;
    if (errorObj.details) appError.details = errorObj.details;
    
    return appError;
  }

  return new Error('An unexpected error occurred') as AppError;
}

/**
 * Gets user-friendly error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  const standardError = standardizeError(error);
  
  // Handle specific error types
  if (standardError.name === 'ValidationError') {
    return standardError.message;
  }
  
  if (standardError.name === 'NetworkError') {
    if (standardError.statusCode === 404) {
      return 'The requested resource was not found';
    }
    if (standardError.statusCode === 401) {
      return 'You are not authorized to perform this action';
    }
    if (standardError.statusCode === 403) {
      return 'You do not have permission to perform this action';
    }
    if (standardError.statusCode === 500) {
      return 'A server error occurred. Please try again later';
    }
    return standardError.message || 'A network error occurred';
  }
  
  if (standardError.name === 'AuthError') {
    return 'Authentication failed. Please log in again';
  }

  return standardError.message || 'An unexpected error occurred';
}

/**
 * Logs error with consistent format
 */
export function logError(error: unknown, context?: string): void {
  const standardError = standardizeError(error);
  const logData = {
    message: standardError.message,
    name: standardError.name,
    stack: standardError.stack,
    code: standardError.code,
    statusCode: standardError.statusCode,
    details: standardError.details,
    context,
    timestamp: new Date().toISOString(),
  };

  console.error('Application Error:', logData);
  
  // In production, you might want to send this to an error tracking service
  // Example: Sentry.captureException(standardError, { extra: logData });
}

/**
 * Handles async operations with consistent error handling
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data: T | null; error: AppError | null }> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    const standardError = standardizeError(error);
    logError(standardError, context);
    return { data: null, error: standardError };
  }
}

/**
 * Creates form validation error messages
 */
export function createValidationError(field: string, message: string): ValidationError {
  return new ValidationError(message, field);
}

/**
 * Handles API response errors
 */
export function handleApiError(response: any): never {
  if (response?.status) {
    throw new NetworkError(
      response.data?.message || response.statusText || 'API request failed',
      response.status
    );
  }
  
  throw new Error(response?.message || 'API request failed');
}

/**
 * Retry mechanism for failed operations
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw standardizeError(lastError);
}