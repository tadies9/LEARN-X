import { Request, Response } from 'express';
import { ModuleService } from '../services/moduleService';
import { CourseService } from '../services/courseService';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export class ModuleController {
  private moduleService: ModuleService;
  private courseService: CourseService;

  constructor() {
    this.moduleService = new ModuleService();
    this.courseService = new CourseService();
  }

  getModules = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const courseId = req.params.courseId;

      // Check if user can access the course
      const course = await this.courseService.getCourse(courseId, userId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }

      const modules = await this.moduleService.getModules(courseId);

      res.json({
        success: true,
        data: modules,
      });
    } catch (error) {
      logger.error('Error getting modules:', error);
      throw new AppError('Failed to retrieve modules', 500);
    }
  };

  getModule = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const moduleId = req.params.id;

      const module = await this.moduleService.getModule(moduleId, userId);

      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Module not found',
        });
      }

      res.json({
        success: true,
        data: module,
      });
    } catch (error) {
      logger.error('Error getting module:', error);
      throw new AppError('Failed to retrieve module', 500);
    }
  };

  createModule = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const { courseId, ...moduleData } = req.body;

      // Check ownership
      const canCreate = await this.courseService.checkCourseOwnership(courseId, userId);
      if (!canCreate) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add modules to this course',
        });
      }

      const module = await this.moduleService.createModule({
        courseId,
        ...moduleData,
      });

      res.status(201).json({
        success: true,
        data: module,
        message: 'Module created successfully',
      });
    } catch (error) {
      logger.error('Error creating module:', error);
      throw new AppError('Failed to create module', 500);
    }
  };

  updateModule = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const moduleId = req.params.id;

      // Check ownership
      const canUpdate = await this.moduleService.checkModuleOwnership(moduleId, userId);
      if (!canUpdate) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this module',
        });
      }

      const module = await this.moduleService.updateModule(moduleId, req.body);

      res.json({
        success: true,
        data: module,
        message: 'Module updated successfully',
      });
    } catch (error) {
      logger.error('Error updating module:', error);
      throw new AppError('Failed to update module', 500);
    }
  };

  deleteModule = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const moduleId = req.params.id;

      // Check ownership
      const canDelete = await this.moduleService.checkModuleOwnership(moduleId, userId);
      if (!canDelete) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this module',
        });
      }

      await this.moduleService.deleteModule(moduleId);

      res.json({
        success: true,
        message: 'Module deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting module:', error);
      throw new AppError('Failed to delete module', 500);
    }
  };

  publishModule = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const moduleId = req.params.id;

      // Check ownership
      const canUpdate = await this.moduleService.checkModuleOwnership(moduleId, userId);
      if (!canUpdate) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to publish this module',
        });
      }

      const module = await this.moduleService.updateModule(moduleId, { isPublished: true });

      res.json({
        success: true,
        data: module,
        message: 'Module published successfully',
      });
    } catch (error) {
      logger.error('Error publishing module:', error);
      throw new AppError('Failed to publish module', 500);
    }
  };

  unpublishModule = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const moduleId = req.params.id;

      // Check ownership
      const canUpdate = await this.moduleService.checkModuleOwnership(moduleId, userId);
      if (!canUpdate) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to unpublish this module',
        });
      }

      const module = await this.moduleService.updateModule(moduleId, { isPublished: false });

      res.json({
        success: true,
        data: module,
        message: 'Module unpublished successfully',
      });
    } catch (error) {
      logger.error('Error unpublishing module:', error);
      throw new AppError('Failed to unpublish module', 500);
    }
  };

  reorderModules = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const { moduleId, newPosition } = req.body;

      // Check ownership
      const canUpdate = await this.moduleService.checkModuleOwnership(moduleId, userId);
      if (!canUpdate) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to reorder this module',
        });
      }

      await this.moduleService.reorderModules(moduleId, newPosition);

      res.json({
        success: true,
        message: 'Modules reordered successfully',
      });
    } catch (error) {
      logger.error('Error reordering modules:', error);
      throw new AppError('Failed to reorder modules', 500);
    }
  };

  getModuleFiles = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const userId = req.user!.id;
      const moduleId = req.params.id;

      // Check if user can access the module
      const module = await this.moduleService.getModule(moduleId, userId);
      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Module not found',
        });
      }

      const files = await this.moduleService.getModuleFiles(moduleId);

      res.json({
        success: true,
        data: files,
      });
    } catch (error) {
      logger.error('Error getting module files:', error);
      throw new AppError('Failed to retrieve module files', 500);
    }
  };
}
