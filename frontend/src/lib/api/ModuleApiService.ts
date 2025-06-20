import { BaseApiService } from './BaseApiService';
import { API_CLIENT } from './client';

import type { Module, CreateModuleInput, UpdateModuleInput, CourseFile } from '@/lib/types/course';

class ModuleApiService extends BaseApiService {
  constructor() {
    super(API_CLIENT, '/modules');
  }

  // Get all modules for a course
  async getModules(courseId: string) {
    return this.getList<Module>(`/modules/course/${courseId}`);
  }

  // Get single module
  async getModule(moduleId: string) {
    return this.getById<Module>(moduleId);
  }

  // Create module
  async createModule(moduleData: CreateModuleInput) {
    return this.create<Module, CreateModuleInput>(moduleData);
  }

  // Update module
  async updateModule(moduleId: string, updateData: UpdateModuleInput) {
    return this.update<Module, UpdateModuleInput>(moduleId, updateData);
  }

  // Delete module
  async deleteModule(moduleId: string) {
    return this.delete(moduleId);
  }

  // Publish module
  async publishModule(moduleId: string) {
    return this.performAction<Module>(moduleId, 'publish');
  }

  // Unpublish module
  async unpublishModule(moduleId: string) {
    return this.performAction<Module>(moduleId, 'unpublish');
  }

  // Reorder modules
  async reorderModules(moduleId: string, newPosition: number) {
    return this.performBatchAction<boolean>('reorder', {
      moduleId,
      newPosition,
    });
  }

  // Get module files
  async getModuleFiles(moduleId: string) {
    return this.customRequest<CourseFile[]>('get', `/modules/${moduleId}/files`);
  }

  // Get modules with their files
  async getModulesWithFiles(courseId: string) {
    const modulesResponse = await this.getModules(courseId);
    const modules = Array.isArray(modulesResponse) ? modulesResponse : modulesResponse.data || [];

    // Fetch files for each module in parallel
    const modulesWithFiles = await Promise.all(
      modules.map(async (module) => {
        try {
          const files = await this.getModuleFiles(module.id);
          return { ...module, files };
        } catch (error) {
          console.warn(`Failed to fetch files for module ${module.id}:`, error);
          return { ...module, files: [] };
        }
      })
    );

    return modulesWithFiles;
  }
}

export const moduleApiService = new ModuleApiService();

// Export for backward compatibility
export const moduleApi = {
  getModules: moduleApiService.getModules.bind(moduleApiService),
  getModule: moduleApiService.getModule.bind(moduleApiService),
  createModule: moduleApiService.createModule.bind(moduleApiService),
  updateModule: moduleApiService.updateModule.bind(moduleApiService),
  deleteModule: moduleApiService.deleteModule.bind(moduleApiService),
  publishModule: moduleApiService.publishModule.bind(moduleApiService),
  unpublishModule: moduleApiService.unpublishModule.bind(moduleApiService),
  reorderModules: moduleApiService.reorderModules.bind(moduleApiService),
  getModuleFiles: moduleApiService.getModuleFiles.bind(moduleApiService),
  getModulesWithFiles: moduleApiService.getModulesWithFiles.bind(moduleApiService),
};
