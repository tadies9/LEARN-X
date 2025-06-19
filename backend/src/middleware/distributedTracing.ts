/**
 * Distributed Tracing Middleware
 * Handles trace context propagation for all requests
 */

import { Request, Response, NextFunction } from 'express';
import { distributedTracing } from '../config/apm/tracing/DistributedTracing';
import { apmService } from '../config/apm/APMService';
import { logger } from '../utils/logger';
import type { DistributedTracingContext } from '../config/apm/types';

declare global {
  namespace Express {
    interface Request {
      traceContext?: DistributedTracingContext;
    }
  }
}

/**
 * Middleware to extract and propagate trace context
 */
export function distributedTracingMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Extract trace context from incoming request
    let traceContext = distributedTracing.extractTraceContext(req);

    // Create new context if none exists
    if (!traceContext) {
      traceContext = distributedTracing.createTraceContext();
    }

    // Store context on request
    req.traceContext = traceContext;

    // Set trace context in APM
    if (apmService.isEnabled()) {
      const provider = (apmService as any).provider;
      if (provider) {
        provider.setTransactionAttribute('trace.id', traceContext.traceId);
        provider.setTransactionAttribute('span.id', traceContext.spanId);
        if (traceContext.parentSpanId) {
          provider.setTransactionAttribute('parent.span.id', traceContext.parentSpanId);
        }
      }
    }

    // Add trace headers to response
    res.setHeader('X-Trace-Id', traceContext.traceId);

    next();
  } catch (error) {
    logger.error('Error in distributed tracing middleware:', error);
    next();
  }
}

/**
 * Helper to create traced HTTP client
 */
export function createTracedHttpClient(baseClient: any) {
  const originalRequest = baseClient.request || baseClient;

  return function tracedRequest(this: any, options: any, ...args: any[]) {
    // Get current trace context
    const context = distributedTracing.getCurrentContext();
    
    if (context) {
      // Ensure headers object exists
      options.headers = options.headers || {};
      
      // Inject trace context
      options.headers = distributedTracing.injectTraceContext(options.headers, context);
    }

    // Start span for external call
    const span = apmService.startSpan(`http.${options.method || 'GET'} ${options.hostname || options.host}${options.path || '/'}`);
    const startTime = Date.now();

    // Wrap callback
    const originalCallback = args[args.length - 1];
    if (typeof originalCallback === 'function') {
      args[args.length - 1] = function (err: any, ...callbackArgs: any[]) {
        const duration = Date.now() - startTime;
        
        // Record external call metrics
        apmService.recordExternalCall(
          options.hostname || options.host || 'unknown',
          `${options.method || 'GET'} ${options.path || '/'}`,
          duration,
          !err,
          callbackArgs[0]?.statusCode
        );

        // End span
        if (span) {
          apmService.endSpan(span);
        }

        // Call original callback
        originalCallback(err, ...callbackArgs);
      };
    }

    return originalRequest.call(this as any, options, ...args);
  };
}

/**
 * Middleware for tracing queue jobs
 */
export function traceQueueJob(jobType: string) {
  return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (jobData: any, ...args: any[]) {
      // Extract trace context from job
      const context = distributedTracing.extractFromQueueJob(jobData);
      
      // Start transaction for job
      const transaction = apmService.startTransaction(`queue.${jobType}`, 'queue');
      
      if (transaction && context) {
        // Set trace context
        const provider = (apmService as any).provider;
        if (provider) {
          provider.setTransactionAttribute('trace.id', context.traceId);
          provider.setTransactionAttribute('parent.span.id', context.parentSpanId);
        }
      }

      try {
        const result = await originalMethod.call(this as any, jobData, ...args);
        
        // Record success
        apmService.recordQueueMetric(jobType, 'process', 1, {
          success: 'true'
        });

        return result;
      } catch (error) {
        // Record failure
        apmService.recordQueueMetric(jobType, 'error', 1);
        apmService.captureError(error as Error, {
          jobType,
          jobData
        });

        throw error;
      } finally {
        if (transaction) {
          apmService.endTransaction(transaction);
        }
      }
    };

    return descriptor;
  };
}

/**
 * Create traced axios instance
 */
export function createTracedAxios(axios: any): any {
  // Add request interceptor
  axios.interceptors.request.use(
    (config: any) => {
      const context = distributedTracing.getCurrentContext();
      
      if (context) {
        config.headers = distributedTracing.injectTraceContext(config.headers || {}, context);
      }

      // Start timing
      config.metadata = { startTime: Date.now() };
      
      // Start span
      const span = apmService.startSpan(`axios.${config.method} ${config.url}`);
      config.metadata.span = span;

      return config;
    },
    (error: any) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor
  axios.interceptors.response.use(
    (response: any) => {
      if (response.config.metadata) {
        const duration = Date.now() - response.config.metadata.startTime;
        
        // Record metrics
        apmService.recordExternalCall(
          new URL(response.config.url).hostname,
          `${response.config.method} ${new URL(response.config.url).pathname}`,
          duration,
          true,
          response.status
        );

        // End span
        if (response.config.metadata.span) {
          apmService.endSpan(response.config.metadata.span);
        }
      }

      return response;
    },
    (error: any) => {
      if (error.config?.metadata) {
        const duration = Date.now() - error.config.metadata.startTime;
        
        // Record metrics
        apmService.recordExternalCall(
          error.config.url ? new URL(error.config.url).hostname : 'unknown',
          `${error.config.method} ${error.config.url ? new URL(error.config.url).pathname : 'unknown'}`,
          duration,
          false,
          error.response?.status
        );

        // End span
        if (error.config.metadata.span) {
          apmService.endSpan(error.config.metadata.span);
        }
      }

      return Promise.reject(error);
    }
  );

  return axios;
}

/**
 * Propagate trace context to Python service
 */
export function propagateToPython(headers: Record<string, string> = {}): Record<string, string> {
  return distributedTracing.propagateToPythonService(headers);
}

/**
 * Propagate trace context to queue job
 */
export function propagateToQueue(jobData: any): any {
  return distributedTracing.propagateToQueueJob(jobData);
}