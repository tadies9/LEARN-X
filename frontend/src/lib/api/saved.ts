import { API_CLIENT } from './client';

export interface SavedContent {
  id: string;
  userId: string;
  fileId: string;
  topicId: string;
  subtopic: string;
  content: string;
  mode: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  course_files?: {
    id: string;
    filename: string;
    course_id: string;
    courses: {
      id: string;
      title: string;
    };
  };
}

export interface SaveContentParams {
  fileId: string;
  topicId: string;
  subtopic?: string;
  content: string;
  mode: string;
  tags?: string[];
  notes?: string;
}

export interface ListSavedContentResponse {
  items: SavedContent[];
  total: number;
  limit: number;
  offset: number;
}

export class SavedContentApiService {
  /**
   * Save content for later reference
   */
  static async save(params: SaveContentParams): Promise<{ success: boolean; message: string }> {
    const response = await API_CLIENT.post('/saved/save', params);
    return response.data;
  }

  /**
   * List saved content
   */
  static async list(params?: {
    fileId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ListSavedContentResponse> {
    const response = await API_CLIENT.get('/saved/list', { params });
    return response.data.data;
  }

  /**
   * Get specific saved content
   */
  static async get(id: string): Promise<SavedContent> {
    const response = await API_CLIENT.get(`/saved/${id}`);
    return response.data.data;
  }

  /**
   * Update saved content (tags/notes)
   */
  static async update(
    id: string,
    updates: {
      tags?: string[];
      notes?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    const response = await API_CLIENT.patch(`/saved/${id}`, updates);
    return response.data;
  }

  /**
   * Delete saved content
   */
  static async delete(id: string): Promise<{ success: boolean; message: string }> {
    const response = await API_CLIENT.delete(`/saved/${id}`);
    return response.data;
  }
}

export default SavedContentApiService;
