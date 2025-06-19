/**
 * Distributed Tracing Implementation
 * Handles trace context propagation across services
 */

import { Request } from 'express';
import { logger } from '../../../utils/logger';
import { apmService } from '../APMService';
import type { DistributedTracingContext } from '../types';

export class DistributedTracingService {
  private static instance: DistributedTracingService;
  
  // Standard trace header names
  private static readonly TRACE_HEADERS = {
    W3C: {
      TRACEPARENT: 'traceparent',
      TRACESTATE: 'tracestate'
    },
    DATADOG: {
      TRACE_ID: 'x-datadog-trace-id',
      PARENT_ID: 'x-datadog-parent-id',
      SAMPLING_PRIORITY: 'x-datadog-sampling-priority'
    },
    NEWRELIC: {
      TRACE_ID: 'x-newrelic-trace-id',
      SPAN_ID: 'x-newrelic-span-id',
      DISTRIBUTED_TRACE: 'newrelic'
    },
    CUSTOM: {
      TRACE_ID: 'x-trace-id',
      SPAN_ID: 'x-span-id',
      PARENT_SPAN_ID: 'x-parent-span-id',
      CORRELATION_ID: 'x-correlation-id'
    }
  };

  private constructor() {}

  static getInstance(): DistributedTracingService {
    if (!DistributedTracingService.instance) {
      DistributedTracingService.instance = new DistributedTracingService();
    }
    return DistributedTracingService.instance;
  }

  /**
   * Extract trace context from incoming request
   */
  extractTraceContext(req: Request): DistributedTracingContext | null {
    try {
      // Try W3C Trace Context first (standard)
      const w3cContext = this.extractW3CContext(req);
      if (w3cContext) return w3cContext;

      // Try provider-specific headers
      const provider = apmService.getProvider();
      switch (provider) {
        case 'datadog':
          return this.extractDatadogContext(req);
        case 'newrelic':
          return this.extractNewRelicContext(req);
        default:
          return this.extractCustomContext(req);
      }
    } catch (error) {
      logger.error('Error extracting trace context:', error);
      return null;
    }
  }

  /**
   * Inject trace context into outgoing request headers
   */
  injectTraceContext(headers: Record<string, string>, context?: DistributedTracingContext): Record<string, string> {
    if (!context) {
      context = this.getCurrentContext() || undefined;
      if (!context) return headers;
    }

    try {
      // Inject W3C headers (standard)
      headers = this.injectW3CContext(headers, context);

      // Inject provider-specific headers
      const provider = apmService.getProvider();
      switch (provider) {
        case 'datadog':
          headers = this.injectDatadogContext(headers, context);
          break;
        case 'newrelic':
          headers = this.injectNewRelicContext(headers, context);
          break;
      }

      // Always inject custom headers for backward compatibility
      headers = this.injectCustomContext(headers, context);

      return headers;
    } catch (error) {
      logger.error('Error injecting trace context:', error);
      return headers;
    }
  }

  /**
   * Create a new trace context
   */
  createTraceContext(parentContext?: DistributedTracingContext): DistributedTracingContext {
    const traceId = parentContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const parentSpanId = parentContext?.spanId;

    return {
      traceId,
      spanId,
      parentSpanId,
      baggage: parentContext?.baggage || {}
    };
  }

  /**
   * Get current trace context from APM provider
   */
  getCurrentContext(): DistributedTracingContext | null {
    try {
      const provider = (apmService as any).provider;
      if (!provider?.isEnabled()) return null;

      switch (apmService.getProvider()) {
        case 'datadog':
          return this.getDatadogContext(provider);
        case 'newrelic':
          return this.getNewRelicContext(provider);
        default:
          return null;
      }
    } catch (error) {
      logger.error('Error getting current trace context:', error);
      return null;
    }
  }

  /**
   * Propagate trace context to Python service
   */
  propagateToPythonService(headers: Record<string, string>): Record<string, string> {
    const context = this.getCurrentContext();
    if (!context) return headers;

    // Add Python service specific headers
    headers['X-Service-Name'] = 'learn-x-api';
    headers['X-Service-Version'] = process.env.npm_package_version || 'unknown';
    
    return this.injectTraceContext(headers, context);
  }

  /**
   * Propagate trace context to queue job
   */
  propagateToQueueJob(jobData: any): any {
    const context = this.getCurrentContext();
    if (!context) return jobData;

    return {
      ...jobData,
      _traceContext: {
        traceId: context.traceId,
        parentSpanId: context.spanId,
        baggage: context.baggage
      }
    };
  }

  /**
   * Extract trace context from queue job
   */
  extractFromQueueJob(jobData: any): DistributedTracingContext | null {
    if (!jobData._traceContext) return null;

    return {
      traceId: jobData._traceContext.traceId,
      spanId: this.generateSpanId(),
      parentSpanId: jobData._traceContext.parentSpanId,
      baggage: jobData._traceContext.baggage || {}
    };
  }

  // W3C Trace Context Implementation
  private extractW3CContext(req: Request): DistributedTracingContext | null {
    const traceparent = req.headers[DistributedTracingService.TRACE_HEADERS.W3C.TRACEPARENT] as string;
    if (!traceparent) return null;

    // Parse traceparent: version-trace_id-parent_id-trace_flags
    const parts = traceparent.split('-');
    if (parts.length !== 4) return null;

    const [_version, traceId, parentId, _flags] = parts;
    
    return {
      traceId,
      spanId: this.generateSpanId(),
      parentSpanId: parentId,
      baggage: this.parseTraceState(req.headers[DistributedTracingService.TRACE_HEADERS.W3C.TRACESTATE] as string)
    };
  }

  private injectW3CContext(headers: Record<string, string>, context: DistributedTracingContext): Record<string, string> {
    const version = '00';
    const flags = '01'; // Sampled
    
    headers[DistributedTracingService.TRACE_HEADERS.W3C.TRACEPARENT] = 
      `${version}-${context.traceId}-${context.spanId}-${flags}`;
    
    if (context.baggage && Object.keys(context.baggage).length > 0) {
      headers[DistributedTracingService.TRACE_HEADERS.W3C.TRACESTATE] = 
        this.formatTraceState(context.baggage);
    }

    return headers;
  }

  // Datadog Implementation
  private extractDatadogContext(req: Request): DistributedTracingContext | null {
    const traceId = req.headers[DistributedTracingService.TRACE_HEADERS.DATADOG.TRACE_ID] as string;
    const parentId = req.headers[DistributedTracingService.TRACE_HEADERS.DATADOG.PARENT_ID] as string;

    if (!traceId) return null;

    return {
      traceId,
      spanId: this.generateSpanId(),
      parentSpanId: parentId,
      baggage: {}
    };
  }

  private injectDatadogContext(headers: Record<string, string>, context: DistributedTracingContext): Record<string, string> {
    headers[DistributedTracingService.TRACE_HEADERS.DATADOG.TRACE_ID] = context.traceId;
    headers[DistributedTracingService.TRACE_HEADERS.DATADOG.PARENT_ID] = context.spanId;
    headers[DistributedTracingService.TRACE_HEADERS.DATADOG.SAMPLING_PRIORITY] = '1';
    
    return headers;
  }

  private getDatadogContext(provider: any): DistributedTracingContext | null {
    try {
      const tracer = provider.tracer;
      const span = tracer.scope().active();
      
      if (!span) return null;

      return {
        traceId: span.context().toTraceId(),
        spanId: span.context().toSpanId(),
        baggage: {}
      };
    } catch (error) {
      return null;
    }
  }

  // New Relic Implementation
  private extractNewRelicContext(req: Request): DistributedTracingContext | null {
    const distributedTrace = req.headers[DistributedTracingService.TRACE_HEADERS.NEWRELIC.DISTRIBUTED_TRACE] as string;
    
    if (!distributedTrace) return null;

    try {
      const parsed = JSON.parse(Buffer.from(distributedTrace, 'base64').toString());
      return {
        traceId: parsed.tr,
        spanId: this.generateSpanId(),
        parentSpanId: parsed.id,
        baggage: parsed.baggage || {}
      };
    } catch (error) {
      return null;
    }
  }

  private injectNewRelicContext(headers: Record<string, string>, context: DistributedTracingContext): Record<string, string> {
    const trace = {
      tr: context.traceId,
      id: context.spanId,
      pr: context.parentSpanId,
      baggage: context.baggage
    };

    headers[DistributedTracingService.TRACE_HEADERS.NEWRELIC.DISTRIBUTED_TRACE] = 
      Buffer.from(JSON.stringify(trace)).toString('base64');
    
    return headers;
  }

  private getNewRelicContext(provider: any): DistributedTracingContext | null {
    try {
      const api = provider.api;
      const transaction = api.getTransaction();
      
      if (!transaction) return null;

      return {
        traceId: transaction.traceId,
        spanId: transaction.id,
        baggage: {}
      };
    } catch (error) {
      return null;
    }
  }

  // Custom Implementation
  private extractCustomContext(req: Request): DistributedTracingContext | null {
    const traceId = req.headers[DistributedTracingService.TRACE_HEADERS.CUSTOM.TRACE_ID] as string;
    const spanId = req.headers[DistributedTracingService.TRACE_HEADERS.CUSTOM.SPAN_ID] as string;
    const parentSpanId = req.headers[DistributedTracingService.TRACE_HEADERS.CUSTOM.PARENT_SPAN_ID] as string;
    const correlationId = req.headers[DistributedTracingService.TRACE_HEADERS.CUSTOM.CORRELATION_ID] as string;

    if (!traceId && !correlationId) return null;

    return {
      traceId: traceId || correlationId || this.generateTraceId(),
      spanId: spanId || this.generateSpanId(),
      parentSpanId,
      baggage: correlationId ? { correlationId } : {}
    };
  }

  private injectCustomContext(headers: Record<string, string>, context: DistributedTracingContext): Record<string, string> {
    headers[DistributedTracingService.TRACE_HEADERS.CUSTOM.TRACE_ID] = context.traceId;
    headers[DistributedTracingService.TRACE_HEADERS.CUSTOM.SPAN_ID] = context.spanId;
    
    if (context.parentSpanId) {
      headers[DistributedTracingService.TRACE_HEADERS.CUSTOM.PARENT_SPAN_ID] = context.parentSpanId;
    }

    if (context.baggage?.correlationId) {
      headers[DistributedTracingService.TRACE_HEADERS.CUSTOM.CORRELATION_ID] = context.baggage.correlationId;
    }

    return headers;
  }

  // Helper Methods
  private generateTraceId(): string {
    // Generate 128-bit trace ID (32 hex characters)
    return Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  private generateSpanId(): string {
    // Generate 64-bit span ID (16 hex characters)
    return Array.from({ length: 16 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  private parseTraceState(tracestate: string): Record<string, string> {
    if (!tracestate) return {};

    const baggage: Record<string, string> = {};
    const parts = tracestate.split(',');

    parts.forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) {
        baggage[key.trim()] = value.trim();
      }
    });

    return baggage;
  }

  private formatTraceState(baggage: Record<string, string>): string {
    return Object.entries(baggage)
      .map(([key, value]) => `${key}=${value}`)
      .join(',');
  }
}

// Export singleton instance
export const distributedTracing = DistributedTracingService.getInstance();