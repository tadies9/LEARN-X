import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

interface CreateModuleData {
  courseId: string;
  title: string;
  description?: string;
  estimatedDuration?: number;
}

interface UpdateModuleData {
  title?: string;
  description?: string;
  estimatedDuration?: number;
  isPublished?: boolean;
  position?: number;
}

export class ModuleService {
  async getModules(courseId: string) {
    try {
      const { data: modules, error } = await supabase
        .from('modules')
        .select(
          `
          *,
          course_files (count)
        `
        )
        .eq('course_id', courseId)
        .order('position', { ascending: true });

      if (error) throw error;

      // Transform to include file count
      const transformedModules = modules?.map((module) => ({
        ...module,
        fileCount: module.course_files?.[0]?.count || 0,
        course_files: undefined,
      }));

      return transformedModules || [];
    } catch (error) {
      logger.error('Error fetching modules:', error);
      throw error;
    }
  }

  async getModule(moduleId: string, userId: string) {
    try {
      const { data: module, error } = await supabase
        .from('modules')
        .select(
          `
          *,
          courses!inner (
            user_id,
            is_public
          ),
          course_files (count)
        `
        )
        .eq('id', moduleId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Check access
      if (module && (module.courses.user_id === userId || module.courses.is_public)) {
        return {
          ...module,
          fileCount: module.course_files?.[0]?.count || 0,
          courses: undefined,
          course_files: undefined,
        };
      }

      return null;
    } catch (error) {
      logger.error('Error fetching module:', error);
      throw error;
    }
  }

  async createModule(moduleData: CreateModuleData) {
    try {
      // Get the current max position
      const { data: maxPositionData } = await supabase
        .from('modules')
        .select('position')
        .eq('course_id', moduleData.courseId)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      const position = (maxPositionData?.position || 0) + 1;

      const { data: module, error } = await supabase
        .from('modules')
        .insert({
          course_id: moduleData.courseId,
          title: moduleData.title,
          description: moduleData.description,
          estimated_duration: moduleData.estimatedDuration,
          position,
        })
        .select()
        .single();

      if (error) throw error;

      return module;
    } catch (error) {
      logger.error('Error creating module:', error);
      throw error;
    }
  }

  async updateModule(moduleId: string, updateData: UpdateModuleData) {
    try {
      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      // Only include fields that are actually being updated
      if (updateData.title !== undefined) updates.title = updateData.title;
      if (updateData.description !== undefined) updates.description = updateData.description;
      if (updateData.estimatedDuration !== undefined)
        updates.estimated_duration = updateData.estimatedDuration;
      if (updateData.isPublished !== undefined) updates.is_published = updateData.isPublished;
      if (updateData.position !== undefined) updates.position = updateData.position;

      const { data: module, error } = await supabase
        .from('modules')
        .update(updates)
        .eq('id', moduleId)
        .select()
        .single();

      if (error) throw error;

      return module;
    } catch (error) {
      logger.error('Error updating module:', error);
      throw error;
    }
  }

  async deleteModule(moduleId: string) {
    try {
      // First, get the module to know its position and course
      const { data: module, error: fetchError } = await supabase
        .from('modules')
        .select('course_id, position')
        .eq('id', moduleId)
        .single();

      if (fetchError) throw fetchError;

      // Delete the module
      const { error: deleteError } = await supabase.from('modules').delete().eq('id', moduleId);

      if (deleteError) throw deleteError;

      // Update positions of remaining modules
      // We need to fetch and update each module individually
      const { data: modulesToUpdate, error: fetchModulesError } = await supabase
        .from('modules')
        .select('id, position')
        .eq('course_id', module.course_id)
        .gt('position', module.position);

      if (fetchModulesError) throw fetchModulesError;

      // Update each module's position
      for (const mod of modulesToUpdate || []) {
        const { error: updateError } = await supabase
          .from('modules')
          .update({ position: mod.position - 1 })
          .eq('id', mod.id);

        if (updateError) throw updateError;
      }
    } catch (error) {
      logger.error('Error deleting module:', error);
      throw error;
    }
  }

  async checkModuleOwnership(moduleId: string, userId: string) {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select(
          `
          courses!inner (
            user_id
          )
        `
        )
        .eq('id', moduleId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return false;
        throw error;
      }

      return (data as any)?.courses?.user_id === userId;
    } catch (error) {
      logger.error('Error checking module ownership:', error);
      throw error;
    }
  }

  async reorderModules(moduleId: string, newPosition: number) {
    try {
      // Use the database function we created
      const { error } = await supabase.rpc('reorder_modules', {
        p_module_id: moduleId,
        p_new_position: newPosition,
      });

      if (error) throw error;
    } catch (error) {
      logger.error('Error reordering modules:', error);
      throw error;
    }
  }

  async getModuleFiles(moduleId: string) {
    try {
      const { data: files, error } = await supabase
        .from('course_files')
        .select('*')
        .eq('module_id', moduleId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return files || [];
    } catch (error) {
      logger.error('Error fetching module files:', error);
      throw error;
    }
  }
}
