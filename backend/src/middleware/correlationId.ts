import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requestContext } from '../utils/logger';
import * as Sentry from '@sentry/node';

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate or extract correlation ID
  const correlationId = req.headers['x-correlation-id'] as string || 
                       req.headers['x-request-id'] as string || 
                       uuidv4();

  // Add to request object
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  // Set Sentry context
  Sentry.setTag('correlation_id', correlationId);
  Sentry.setContext('request', {
    correlationId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Run the rest of the request in the context
  requestContext.run({
    correlationId,
    userId: undefined, // Will be set by auth middleware
    requestPath: req.path,
    requestMethod: req.method,
  }, () => {
    next();
  });
}