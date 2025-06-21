import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../utils/controllerHelpers';
import { CourseService } from '../services/courseService';
import { ModuleService } from '../services/moduleService';
import { FileService } from '../services/fileService';

// Generic permission middleware factory
export function createOwnershipMiddleware<
  T extends { checkOwnership: (id: string, userId: string) => Promise<boolean> },
>(service: T, paramName = 'id', action = 'access this resource') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const resourceId = req.params[paramName];
      if (!resourceId) {
        res.status(400).json({
          success: false,
          message: `${paramName} parameter is required`,
        });
        return;
      }

      const hasOwnership = await service.checkOwnership(resourceId, userId);
      if (!hasOwnership) {
        res.status(403).json({
          success: false,
          message: `You do not have permission to ${action}`,
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to verify permissions',
      });
      return;
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
    {
      checkOwnership: (id: string, userId: string) =>
        PermissionMiddleware.courseService.checkCourseOwnership(id, userId),
    },
    'id',
    'modify this course'
  );

  static requireCourseAccess = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const courseId = req.params.id || req.params.courseId;
      if (!courseId) {
        res.status(400).json({
          success: false,
          message: 'Course ID is required',
        });
        return;
      }

      const course = await PermissionMiddleware.courseService.getCourse(courseId, userId);
      if (!course) {
        res.status(404).json({
          success: false,
          message: 'Course not found or access denied',
        });
        return;
      }

      // Attach course to request for later use
      req.course = course;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to verify course access',
      });
      return;
    }
  };

  // Module permissions
  static requireModuleOwnership = createOwnershipMiddleware(
    {
      checkOwnership: (id: string, userId: string) =>
        PermissionMiddleware.moduleService.checkModuleOwnership(id, userId),
    },
    'id',
    'modify this module'
  );

  static requireModuleAccess = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const moduleId = req.params.id || req.params.moduleId;
      if (!moduleId) {
        res.status(400).json({
          success: false,
          message: 'Module ID is required',
        });
        return;
      }

      const module = await PermissionMiddleware.moduleService.getModule(moduleId, userId);
      if (!module) {
        res.status(404).json({
          success: false,
          message: 'Module not found or access denied',
        });
      }

      // Attach module to request for later use
      req.module = module;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to verify module access',
      });
      return;
    }
  };

  // File permissions
  static requireFileOwnership = createOwnershipMiddleware(
    {
      checkOwnership: (id: string, userId: string) =>
        PermissionMiddleware.fileService.checkFileOwnership(id, userId),
    },
    'id',
    'modify this file'
  );

  static requireFileAccess = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const fileId = req.params.id || req.params.fileId;
      if (!fileId) {
        res.status(400).json({
          success: false,
          message: 'File ID is required',
        });
        return;
      }

      const file = await PermissionMiddleware.fileService.getFile(fileId, userId);
      if (!file) {
        res.status(404).json({
          success: false,
          message: 'File not found or access denied',
        });
        return;
      }

      // Attach file to request for later use
      req.file = file;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to verify file access',
      });
      return;
    }
  };

  // Role-based permissions
  static requireRole(allowedRoles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      const userRole = req.user?.role;

      if (!userRole || !allowedRoles.includes(userRole)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
        return;
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
