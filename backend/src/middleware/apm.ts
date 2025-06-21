/**
 * APM Middleware
 * Automatically tracks HTTP transactions and adds context
 */

import { Request, Response, NextFunction } from 'express';
import { apmService } from '../config/apm/APMService';
import type { APMTransaction } from '../config/apm/types';

declare global {
  namespace Express {
    interface Request {
      apmTransaction?: APMTransaction;
      startTime?: number;
    }
  }
}

/**
 * Main APM middleware for tracking HTTP transactions
 */
export function apmMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip health checks and metrics endpoints
  if (req.path === '/health' || req.path === '/metrics' || req.path === '/ping') {
    return next();
  }

  req.startTime = Date.now();

  // Start APM transaction
  const transactionName = `${req.method} ${normalizeRoute(req.route?.path || req.path)}`;
  const transaction = apmService.startTransaction(transactionName, 'http');

  if (transaction) {
    req.apmTransaction = transaction;

    // Set transaction attributes
    apmService.setUser(req.user?.id || 'anonymous', {
      role: req.user?.role,
      email: req.user?.email,
    });

    // Add request context
    if (apmService.isEnabled()) {
      setTransactionAttributes(req, transaction);
    }
  }

  // Capture response metrics
  const originalSend = res.send;
  res.send = function (data: any): Response {
    res.send = originalSend;

    if (req.apmTransaction && req.startTime) {
      const duration = Date.now() - req.startTime;

      // Record response metrics
      apmService.recordBusinessMetric('http.request.duration', duration, 'ms', {
        method: req.method,
        path: normalizeRoute(req.route?.path || req.path),
        status: res.statusCode.toString(),
      });

      // Set response attributes
      if (apmService.isEnabled()) {
        const provider = (apmService as any).provider;
        if (provider) {
          provider.setTransactionAttribute('response.status', res.statusCode);
          provider.setTransactionAttribute('response.size', Buffer.byteLength(data));
        }
      }

      // End transaction
      apmService.endTransaction(req.apmTransaction);
    }

    return res.send(data);
  };

  // Handle errors
  const originalNext = next;
  next = function (error?: any): void {
    if (error && req.apmTransaction) {
      apmService.captureError(error, {
        request: {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: req.body,
          params: req.params,
          query: req.query,
        },
        user: req.user,
        correlationId: req.headers['x-correlation-id'] as string,
      });
    }
    originalNext(error);
  };

  next();
}

/**
 * Middleware for tracking database queries
 */
export function databaseAPMMiddleware(queryFn: Function) {
  return async function (this: any, ...args: any[]) {
    const startTime = Date.now();
    const query = args[0]?.text || args[0] || 'unknown';

    try {
      const result = await queryFn.apply(this, args);
      const duration = Date.now() - startTime;

      apmService.recordDatabaseQuery(query, duration, 'postgres');

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      apmService.recordDatabaseQuery(query, duration, 'postgres');
      apmService.captureError(error as Error, {
        query,
        duration,
        database: 'postgres',
      });

      throw error;
    }
  };
}

/**
 * Middleware for tracking external API calls
 */
export function externalServiceAPMMiddleware(serviceName: string) {
  return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const span = apmService.startSpan(`external.${serviceName}.${propertyKey}`);

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        apmService.recordExternalCall(serviceName, propertyKey, duration, true);

        if (span) {
          apmService.endSpan(span);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        apmService.recordExternalCall(serviceName, propertyKey, duration, false);
        apmService.captureError(error as Error, {
          service: serviceName,
          operation: propertyKey,
          duration,
        });

        if (span) {
          apmService.endSpan(span);
        }

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator for tracking method execution
 */
export function trackExecution(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const spanName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const span = apmService.startSpan(spanName);

      try {
        const result = await originalMethod.apply(this, args);

        if (span) {
          apmService.endSpan(span);
        }

        return result;
      } catch (error) {
        apmService.captureError(error as Error, {
          method: spanName,
          args: args.length,
        });

        if (span) {
          apmService.endSpan(span);
        }

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Helper function to normalize routes for APM
 */
function normalizeRoute(path: string): string {
  return path
    .replace(/\/[a-f0-9-]{36}/gi, '/:id') // UUIDs
    .replace(/\/\d+/g, '/:id') // Numeric IDs
    .replace(/\?.*$/, ''); // Remove query strings
}

/**
 * Set transaction attributes from request
 */
function setTransactionAttributes(req: Request, _transaction: APMTransaction): void {
  const provider = (apmService as any).provider;
  if (!provider) return;

  // Request attributes
  provider.setTransactionAttribute('request.method', req.method);
  provider.setTransactionAttribute('request.path', req.path);
  provider.setTransactionAttribute('request.ip', req.ip);
  provider.setTransactionAttribute('request.user_agent', req.get('user-agent'));

  // Headers
  const correlationId = req.headers['x-correlation-id'];
  if (correlationId) {
    provider.setTransactionAttribute('correlation.id', correlationId);
  }

  // User context
  if (req.user) {
    provider.setTransactionAttribute('user.id', req.user.id);
    provider.setTransactionAttribute('user.role', req.user.role);
  }

  // Route parameters
  if (req.params) {
    Object.entries(req.params).forEach(([key, value]) => {
      provider.setTransactionAttribute(`request.params.${key}`, value);
    });
  }
}
