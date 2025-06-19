import { Request, Response, NextFunction } from 'express';
import { AppError } from './errors';
import { logger } from './logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Base controller class with common patterns
export abstract class BaseController {
  protected getUserId(req: AuthenticatedRequest): string {
    if (!req.user?.id) {
      throw new AppError('User not authenticated', 401);
    }
    return req.user.id;
  }

  public sendSuccess<T>(res: Response, data?: T, message?: string, statusCode = 200): void {
    const response: ApiResponse<T> = {
      success: true,
      ...(data !== undefined && { data }),
      ...(message && { message }),
    };

    res.status(statusCode).json(response);
  }

  public sendPaginatedSuccess<T>(
    res: Response,
    result: PaginationResult<T>,
    message?: string
  ): void {
    const response: ApiResponse<T[]> = {
      success: true,
      data: result.data,
      ...(message && { message }),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };

    res.json(response);
  }

  public sendError(res: Response, message: string, statusCode = 500): void {
    res.status(statusCode).json({
      success: false,
      message,
    });
  }

  public sendNotFound(res: Response, resource = 'Resource'): void {
    this.sendError(res, `${resource} not found`, 404);
  }

  public sendForbidden(res: Response, action = 'perform this action'): void {
    this.sendError(res, `You do not have permission to ${action}`, 403);
  }

  public sendBadRequest(res: Response, message: string): void {
    this.sendError(res, message, 400);
  }

  public sendUnauthorized(res: Response, message = 'Authentication required'): void {
    this.sendError(res, message, 401);
  }
}

// Wrapper for async controller methods with error handling
export function asyncHandler(
  fn: (req: AuthenticatedRequest, res: Response) => Promise<void | Response>
) {
  return async (req: AuthenticatedRequest, res: Response): Promise<void | Response> => {
    try {
      return await fn(req, res);
    } catch (error) {
      logger.error('Controller error:', error);

      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
}

// Permission checking utilities
export interface PermissionChecker<T = any> {
  checkOwnership(resourceId: string, userId: string): Promise<boolean>;
  checkAccess(resourceId: string, userId: string): Promise<T | null>;
}

export function createPermissionMiddleware<T>(
  checker: PermissionChecker<T>,
  resourceParam = 'id',
  action = 'access this resource'
) {
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

      const resourceId = req.params[resourceParam];
      if (!resourceId) {
        res.status(400).json({
          success: false,
          message: `${resourceParam} parameter is required`,
        });
        return;
      }

      const hasPermission = await checker.checkOwnership(resourceId, userId);
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: `You do not have permission to ${action}`,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify permissions',
      });
      return;
    }
  };
}

// Common CRUD operation handlers
export class CrudHelpers {
  static createGetListHandler<T, F = any>(
    service: {
      getList(filters: F, userId: string): Promise<PaginationResult<T>>;
    },
    filterTransform?: (query: any, userId: string) => F
  ) {
    return asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.id;
      const filters = filterTransform ? filterTransform(req.query, userId) : (req.query as F);

      const result = await service.getList(filters, userId);

      const controller = new (class extends BaseController {})();
      controller.sendPaginatedSuccess(res, result);
    });
  }

  static createGetByIdHandler<T>(
    service: {
      getById(id: string, userId: string): Promise<T | null>;
    },
    resourceName = 'Resource'
  ) {
    return asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.id;
      const id = req.params.id;

      const resource = await service.getById(id, userId);

      const controller = new (class extends BaseController {})();
      if (!resource) {
        return controller.sendNotFound(res, resourceName);
      }

      controller.sendSuccess(res, resource);
    });
  }

  static createCreateHandler<T, C = any>(
    service: {
      create(data: C, userId: string): Promise<T>;
    },
    dataTransform?: (body: any, userId: string) => C,
    resourceName = 'Resource'
  ) {
    return asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.id;
      const data = dataTransform ? dataTransform(req.body, userId) : (req.body as C);

      const resource = await service.create(data, userId);

      const controller = new (class extends BaseController {})();
      controller.sendSuccess(res, resource, `${resourceName} created successfully`, 201);
    });
  }

  static createUpdateHandler<T, U = any>(
    service: {
      update(id: string, data: U, userId: string): Promise<T>;
      checkOwnership(id: string, userId: string): Promise<boolean>;
    },
    resourceName = 'Resource'
  ) {
    return asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.id;
      const id = req.params.id;

      const controller = new (class extends BaseController {})();

      // Check ownership
      const hasOwnership = await service.checkOwnership(id, userId);
      if (!hasOwnership) {
        return controller.sendForbidden(res, `update this ${resourceName.toLowerCase()}`);
      }

      const resource = await service.update(id, req.body, userId);
      controller.sendSuccess(res, resource, `${resourceName} updated successfully`);
    });
  }

  static createDeleteHandler(
    service: {
      delete(id: string, userId: string): Promise<void>;
      checkOwnership(id: string, userId: string): Promise<boolean>;
    },
    resourceName = 'Resource'
  ) {
    return asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
      const userId = req.user!.id;
      const id = req.params.id;

      const controller = new (class extends BaseController {})();

      // Check ownership
      const hasOwnership = await service.checkOwnership(id, userId);
      if (!hasOwnership) {
        return controller.sendForbidden(res, `delete this ${resourceName.toLowerCase()}`);
      }

      await service.delete(id, userId);
      controller.sendSuccess(res, undefined, `${resourceName} deleted successfully`);
    });
  }
}

// Validation helpers
export function validateRequired(data: Record<string, any>, fields: string[]): string[] {
  const missing: string[] = [];

  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }

  return missing;
}

export function validateRequestBody(requiredFields: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const missing = validateRequired(req.body, requiredFields);

    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`,
      });
      return;
    }

    next();
  };
}
