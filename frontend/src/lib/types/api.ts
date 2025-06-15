// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<PaginatedData<T>> {}

export interface ApiFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | boolean | null | undefined;
}

// Helper type guards
export function isPaginatedResponse<T>(
  response: PaginatedResponse<T> | T[]
): response is PaginatedResponse<T> {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    'data' in response &&
    'items' in (response as any).data
  );
}

export function extractItems<T>(
  response: PaginatedResponse<T> | T[]
): T[] {
  if (isPaginatedResponse(response)) {
    return response.data.items;
  }
  return response;
}