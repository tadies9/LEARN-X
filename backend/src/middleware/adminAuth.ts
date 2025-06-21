import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

/**
 * Middleware to require admin role
 * Must be used after authenticate middleware
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.userId) {
      throw new AppError('Authentication required', 401);
    }

    // Check admin role
    // In production, this would check against the database
    // For now, we'll use a simple check
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || [];

    if (!adminUserIds.includes(req.userId)) {
      logger.warn(`Unauthorized admin access attempt by user: ${req.userId}`);
      throw new AppError('Admin access required', 403);
    }

    // User is admin, proceed
    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    } else {
      logger.error('Admin auth middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
};

/**
 * Middleware to optionally check admin role
 * Adds isAdmin flag to request
 */
export const checkAdmin = async (
  req: AuthenticatedRequest & { isAdmin?: boolean },
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userId) {
      req.isAdmin = false;
      return next();
    }

    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',') || [];
    req.isAdmin = adminUserIds.includes(req.userId);

    next();
  } catch (error) {
    logger.error('Check admin middleware error:', error);
    req.isAdmin = false;
    next();
  }
};
