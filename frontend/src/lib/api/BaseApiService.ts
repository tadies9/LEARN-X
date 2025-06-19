import type { AxiosInstance, AxiosRequestConfig } from 'axios';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | boolean | null | undefined;
}

export abstract class BaseApiService {
  protected client: AxiosInstance;
  protected baseEndpoint: string;

  constructor(client: AxiosInstance, baseEndpoint: string) {
    this.client = client;
    this.baseEndpoint = baseEndpoint;
  }

  // Standard CRUD operations
  protected async getList<T>(
    endpoint?: string,
    filters?: ApiFilters
  ): Promise<PaginatedResponse<T> | T[]> {
    const url = endpoint || this.baseEndpoint;
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const queryString = params.toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    const response = await this.client.get<ApiResponse<PaginatedResponse<T> | T[]>>(fullUrl);
    return response.data.data;
  }

  protected async getById<T>(id: string, endpoint?: string): Promise<T> {
    const url = endpoint || `${this.baseEndpoint}/${id}`;
    const response = await this.client.get<ApiResponse<T>>(url);
    return response.data.data;
  }

  protected async create<T, U = Partial<T>>(data: U, endpoint?: string): Promise<T> {
    const url = endpoint || this.baseEndpoint;
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return response.data.data;
  }

  protected async update<T, U = Partial<T>>(
    id: string,
    data: U,
    endpoint?: string,
    method: 'put' | 'patch' = 'patch'
  ): Promise<T> {
    const url = endpoint || `${this.baseEndpoint}/${id}`;
    const response = await this.client[method]<ApiResponse<T>>(url, data);
    return response.data.data;
  }

  protected async delete(id: string, endpoint?: string): Promise<boolean> {
    const url = endpoint || `${this.baseEndpoint}/${id}`;
    const response = await this.client.delete<ApiResponse<boolean>>(url);
    return response.data.success;
  }

  // Common actions
  protected async performAction<T>(
    id: string,
    action: string,
    data?: Record<string, unknown>,
    method: 'post' | 'put' | 'patch' = 'post'
  ): Promise<T> {
    const url = `${this.baseEndpoint}/${id}/${action}`;
    const response = await this.client[method]<ApiResponse<T>>(url, data);
    return response.data.data;
  }

  protected async performBatchAction<T>(
    action: string,
    data: Record<string, unknown>,
    method: 'post' | 'put' | 'patch' = 'post'
  ): Promise<T> {
    const url = `${this.baseEndpoint}/${action}`;
    const response = await this.client[method]<ApiResponse<T>>(url, data);
    return response.data.data;
  }

  // File upload helper
  protected async uploadFile<T>(
    file: File,
    additionalData?: Record<string, unknown>,
    endpoint?: string
  ): Promise<T> {
    const url = endpoint || `${this.baseEndpoint}/upload`;
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });
    }

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }

  // Statistics helper
  protected async getStats<T>(id: string): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(`${this.baseEndpoint}/${id}/stats`);
    return response.data.data;
  }

  // Custom request helper
  protected async customRequest<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client[method]<ApiResponse<T>>(url, data, config);
    return method === 'delete' ? (response.data.success as T) : response.data.data;
  }
}
