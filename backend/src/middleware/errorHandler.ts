import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/node';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  _: NextFunction
) => {
  const correlationId = req.headers['x-correlation-id'] as string;

  // Capture error in Sentry
  Sentry.captureException(err, {
    tags: {
      correlation_id: correlationId,
    },
    extra: {
      request_url: req.url,
      request_method: req.method,
      user_id: (req as any).user?.id,
    },
  });

  logger.error({
    error: err,
    request: req.url,
    method: req.method,
    ip: req.ip,
    correlationId,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: err.errors,
        timestamp: new Date().toISOString(),
        requestId: correlationId,
      },
    });
  }

  // Operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code || 'APP_ERROR',
        message: err.message,
        timestamp: new Date().toISOString(),
        requestId: correlationId,
      },
    });
  }

  // Unhandled errors
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  return res.status(statusCode).json({
    error: {
      code: 'INTERNAL_ERROR',
      message,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'],
    },
  });
};
