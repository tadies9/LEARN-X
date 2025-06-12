import { api } from './client';
import type { CourseFile } from '@/lib/types/course';
import type { CreateFileData, UpdateFileData } from '@/lib/validations/course';

export const fileApi = {
  async getModuleFiles(moduleId: string) {
    const response = await api.get<CourseFile[]>(`/modules/${moduleId}/files`);
    return response.data;
  },

  async getFile(fileId: string) {
    const response = await api.get<CourseFile>(`/files/${fileId}`);
    return response.data;
  },

  async uploadFile(moduleId: string, file: File, data: Partial<CreateFileData>) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('moduleId', moduleId);
    if (data.description) formData.append('description', data.description);
    if (data.processingOptions) {
      formData.append('processingOptions', JSON.stringify(data.processingOptions));
    }

    const response = await api.post<CourseFile>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async updateFile(fileId: string, data: UpdateFileData) {
    const response = await api.put<CourseFile>(`/files/${fileId}`, data);
    return response.data;
  },

  async deleteFile(fileId: string) {
    await api.delete(`/files/${fileId}`);
  },

  async reorderFiles(moduleId: string, fileIds: string[]) {
    const response = await api.put<CourseFile[]>(`/modules/${moduleId}/files/reorder`, {
      fileIds,
    });
    return response.data;
  },

  async getSignedUrl(fileId: string, expiresIn = 3600) {
    const response = await api.get<{ url: string }>(`/files/${fileId}/signed-url`, {
      params: { expiresIn },
    });
    return response.data.url;
  },
};
