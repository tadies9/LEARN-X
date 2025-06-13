import { BaseApiService } from './BaseApiService';
import { API_CLIENT } from './client';

import type { CourseFile } from '@/lib/types/course';
import type { CreateFileData, UpdateFileData } from '@/lib/validations/course';

class FileApiService extends BaseApiService {
  constructor() {
    super(API_CLIENT, '/files');
  }

  // Get files for a module
  async getModuleFiles(moduleId: string) {
    return this.customRequest<CourseFile[]>('get', `/modules/${moduleId}/files`);
  }

  // Get single file
  async getFile(fileId: string) {
    return this.getById<CourseFile>(fileId);
  }

  // Upload file
  async uploadFile(moduleId: string, file: File, data: Partial<CreateFileData>) {
    const additionalData = {
      moduleId,
      ...data,
    };
    return this.uploadFile<CourseFile>(file, additionalData);
  }

  // Update file
  async updateFile(fileId: string, data: UpdateFileData) {
    return this.update<CourseFile, UpdateFileData>(fileId, data, undefined, 'put');
  }

  // Delete file
  async deleteFile(fileId: string) {
    return this.delete(fileId);
  }

  // Reorder files within a module
  async reorderFiles(moduleId: string, fileIds: string[]) {
    return this.customRequest<CourseFile[]>(
      'put',
      `/modules/${moduleId}/files/reorder`,
      { fileIds }
    );
  }

  // Get signed URL for file access
  async getSignedUrl(fileId: string, expiresIn = 3600) {
    const response = await this.customRequest<{ url: string; expiresAt: string }>(
      'get',
      `${this.baseEndpoint}/${fileId}/signed-url`,
      undefined,
      { params: { expiresIn } }
    );
    return response.url;
  }
}

export const fileApiService = new FileApiService();

// Export for backward compatibility
export const fileApi = {
  getModuleFiles: fileApiService.getModuleFiles.bind(fileApiService),
  getFile: fileApiService.getFile.bind(fileApiService),
  uploadFile: fileApiService.uploadFile.bind(fileApiService),
  updateFile: fileApiService.updateFile.bind(fileApiService),
  deleteFile: fileApiService.deleteFile.bind(fileApiService),
  reorderFiles: fileApiService.reorderFiles.bind(fileApiService),
  getSignedUrl: fileApiService.getSignedUrl.bind(fileApiService),
};