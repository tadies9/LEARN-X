import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../utils/controllerHelpers';
import { CourseService } from '../services/courseService';
import { ModuleService } from '../services/moduleService';
import { FileService } from '../services/fileService';

// Generic permission middleware factory
export function createOwnershipMiddleware<T extends { checkOwnership: (id: string, userId: string) => Promise<boolean> }>(
  service: T,
  paramName = 'id',
  action = 'access this resource'
) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const resourceId = req.params[paramName];
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: `${paramName} parameter is required`,
        });
      }

      const hasOwnership = await service.checkOwnership(resourceId, userId);
      if (!hasOwnership) {
        return res.status(403).json({
          success: false,
          message: `You do not have permission to ${action}`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to verify permissions',
      });
    }
  };
}

// Specific middleware instances
export class PermissionMiddleware {
  private static courseService = new CourseService();
  private static moduleService = new ModuleService();
  private static fileService = new FileService();

  // Course permissions
  static requireCourseOwnership = createOwnershipMiddleware(
    this.courseService,
    'id',
    'modify this course'
  );

  static requireCourseAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const courseId = req.params.id || req.params.courseId;
      if (!courseId) {
        return res.status(400).json({
          success: false,
          message: 'Course ID is required',
        });
      }

      const course = await this.courseService.getCourse(courseId, userId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found or access denied',
        });
      }

      // Attach course to request for later use
      req.course = course;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to verify course access',
      });
    }
  };

  // Module permissions
  static requireModuleOwnership = createOwnershipMiddleware(
    this.moduleService,
    'id',
    'modify this module'
  );

  static requireModuleAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const moduleId = req.params.id || req.params.moduleId;
      if (!moduleId) {
        return res.status(400).json({
          success: false,
          message: 'Module ID is required',
        });
      }

      const module = await this.moduleService.getModule(moduleId, userId);
      if (!module) {
        return res.status(404).json({
          success: false,
          message: 'Module not found or access denied',
        });
      }

      // Attach module to request for later use
      req.module = module;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to verify module access',
      });
    }
  };

  // File permissions
  static requireFileOwnership = createOwnershipMiddleware(
    this.fileService,
    'id',
    'modify this file'
  );

  static requireFileAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const fileId = req.params.id || req.params.fileId;
      if (!fileId) {
        return res.status(400).json({
          success: false,
          message: 'File ID is required',
        });
      }

      const file = await this.fileService.getFile(fileId, userId);
      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found or access denied',
        });
      }

      // Attach file to request for later use
      req.file = file;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to verify file access',
      });
    }
  };

  // Role-based permissions
  static requireRole(allowedRoles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const userRole = req.user?.role;
      
      if (!userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }

      next();
    };
  }

  static requireAdmin = this.requireRole(['admin']);
  static requireTeacher = this.requireRole(['teacher', 'admin']);
}

// Extend the AuthenticatedRequest interface
declare module '../utils/controllerHelpers' {
  interface AuthenticatedRequest {
    course?: any;
    module?: any;
    file?: any;
  }
}