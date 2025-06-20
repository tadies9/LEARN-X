import { toast } from 'sonner';

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

export class ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;

  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function handleApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  if (typeof error === 'string') {
    return new ApiError(error);
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return new ApiError(
      (error as any).message,
      (error as any).status,
      (error as any).code,
      (error as any).details
    );
  }

  return new ApiError('An unexpected error occurred');
}

export function showErrorToast(error: unknown, fallbackMessage = 'An error occurred') {
  const apiError = handleApiError(error);
  toast.error(apiError.message || fallbackMessage);
}

export function getErrorMessage(error: unknown, fallbackMessage = 'An error occurred'): string {
  const apiError = handleApiError(error);
  return apiError.message || fallbackMessage;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function getStatusCode(error: unknown): number | undefined {
  if (isApiError(error)) {
    return error.status;
  }
  return undefined;
}