import { API_CLIENT } from './client';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'uploading' | 'processing' | 'chunking' | 'embedding' | 'completed' | 'error';
  progress: number;
  processingStage?: 'upload' | 'extract' | 'chunk' | 'embed' | 'ready';
  chunkCount?: number;
  embeddingCount?: number;
  error?: string;
  uploadedAt: string;
}

export interface FileProcessingStatus {
  fileId: string;
  status: string;
  progress: number;
  stage: string;
  chunksGenerated: number;
  embeddingsGenerated: number;
  totalChunks: number;
  processingTime: number;
  error?: string;
}

export class FileApiService {
  /**
   * Upload a file with enhanced processing
   */
  static async uploadFile(
    file: File, 
    courseId: string, 
    moduleId?: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadedFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', courseId);
    if (moduleId) {
      formData.append('moduleId', moduleId);
    }

    const response = await API_CLIENT.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    });

    return response.data.data;
  }

  /**
   * Get file processing status
   */
  static async getProcessingStatus(fileId: string): Promise<FileProcessingStatus> {
    const response = await API_CLIENT.get(`/files/${fileId}/status`);
    return response.data.data;
  }

  /**
   * Get all files for a course
   */
  static async getFiles(courseId: string): Promise<UploadedFile[]> {
    const response = await API_CLIENT.get('/files', {
      params: { courseId }
    });
    return response.data.data;
  }

  /**
   * Delete a file
   */
  static async deleteFile(fileId: string): Promise<void> {
    await API_CLIENT.delete(`/files/${fileId}`);
  }

  /**
   * Retry file processing
   */
  static async retryProcessing(fileId: string): Promise<void> {
    await API_CLIENT.post(`/files/${fileId}/retry`);
  }

  /**
   * Get file analytics
   */
  static async getFileAnalytics(fileId: string): Promise<{
    chunkCount: number;
    embeddingCount: number;
    contentTypes: Record<string, number>;
    processingTime: number;
    fileSize: number;
    readingTime: number;
  }> {
    const response = await API_CLIENT.get(`/files/${fileId}/analytics`);
    return response.data.data;
  }

  /**
   * Listen to file processing updates via SSE
   */
  static getProcessingUpdatesUrl(fileId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    // Token will be handled by the API client headers
    return `${baseUrl}/files/${fileId}/processing-updates`;
  }
}

export default FileApiService;