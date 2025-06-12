import { apiClient } from '@/lib/api/client';
import type { Module, CreateModuleInput, UpdateModuleInput, CourseFile } from '@/lib/types/course';

interface ModulesResponse {
  success: boolean;
  data: Module[];
}

interface ModuleResponse {
  success: boolean;
  data: Module;
}

interface FilesResponse {
  success: boolean;
  data: CourseFile[];
}

export const moduleApi = {
  // Get all modules for a course
  getModules: async (courseId: string) => {
    const response = await apiClient.get<ModulesResponse>(`/modules/course/${courseId}`);
    return response.data.data;
  },

  // Get single module
  getModule: async (moduleId: string) => {
    const response = await apiClient.get<ModuleResponse>(`/modules/${moduleId}`);
    return response.data.data;
  },

  // Create module
  createModule: async (moduleData: CreateModuleInput) => {
    const response = await apiClient.post<ModuleResponse>('/modules', moduleData);
    return response.data.data;
  },

  // Update module
  updateModule: async (moduleId: string, updateData: UpdateModuleInput) => {
    const response = await apiClient.patch<ModuleResponse>(`/modules/${moduleId}`, updateData);
    return response.data.data;
  },

  // Delete module
  deleteModule: async (moduleId: string) => {
    const response = await apiClient.delete<{ success: boolean }>(`/modules/${moduleId}`);
    return response.data.success;
  },

  // Publish module
  publishModule: async (moduleId: string) => {
    const response = await apiClient.post<ModuleResponse>(`/modules/${moduleId}/publish`);
    return response.data.data;
  },

  // Unpublish module
  unpublishModule: async (moduleId: string) => {
    const response = await apiClient.post<ModuleResponse>(`/modules/${moduleId}/unpublish`);
    return response.data.data;
  },

  // Reorder modules
  reorderModules: async (moduleId: string, newPosition: number) => {
    const response = await apiClient.post<{ success: boolean }>('/modules/reorder', {
      moduleId,
      newPosition,
    });
    return response.data.success;
  },

  // Get module files
  getModuleFiles: async (moduleId: string) => {
    const response = await apiClient.get<FilesResponse>(`/modules/${moduleId}/files`);
    return response.data.data;
  },
};
