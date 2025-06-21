/**
 * Python Service APM Integration
 * Provides utilities for monitoring Python services and correlating traces
 */

import { logger } from '../../../utils/logger';
import { apmService } from '../APMService';
import { distributedTracing } from '../tracing/DistributedTracing';
import { businessMetrics } from '../metrics/BusinessMetrics';

export interface PythonServiceConfig {
  serviceName: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  healthCheckEndpoint?: string;
  traceHeaderFormat: 'w3c' | 'datadog' | 'custom';
}

export interface PythonServiceCall {
  operation: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface PythonServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode: number;
  duration: number;
  traceId?: string;
}

export class PythonServiceIntegration {
  private static instances: Map<string, PythonServiceIntegration> = new Map();
  private config: PythonServiceConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private healthStatus: boolean = true;

  constructor(config: PythonServiceConfig) {
    this.config = config;
    this.startHealthChecks();
  }

  static getInstance(serviceName: string, config?: PythonServiceConfig): PythonServiceIntegration {
    let instance = PythonServiceIntegration.instances.get(serviceName);

    if (!instance && config) {
      instance = new PythonServiceIntegration(config);
      PythonServiceIntegration.instances.set(serviceName, instance);
    }

    if (!instance) {
      throw new Error(`Python service ${serviceName} not configured`);
    }

    return instance;
  }

  /**
   * Make a traced call to Python service
   */
  async call(callConfig: PythonServiceCall): Promise<PythonServiceResponse> {
    const startTime = Date.now();
    const span = apmService.startSpan(`python.${this.config.serviceName}.${callConfig.operation}`);

    try {
      // Prepare headers with trace context
      const headers = this.prepareHeaders(callConfig.headers || {});

      // Set span attributes
      if (span) {
        apmService.setSpanAttribute(span, 'service.name', this.config.serviceName);
        apmService.setSpanAttribute(span, 'service.operation', callConfig.operation);
        apmService.setSpanAttribute(span, 'http.method', callConfig.method);
        apmService.setSpanAttribute(
          span,
          'http.url',
          `${this.config.baseUrl}${callConfig.endpoint}`
        );
      }

      // Make the HTTP call
      const response = await this.makeHttpCall(callConfig, headers);
      const duration = Date.now() - startTime;

      // Record success metrics
      this.recordCallMetrics(callConfig, response, duration, true);

      // Set response attributes
      if (span) {
        apmService.setSpanAttribute(span, 'http.status_code', response.statusCode);
        apmService.setSpanAttribute(span, 'response.duration', duration);
        apmService.endSpan(span);
      }

      return {
        success: true,
        data: response.data,
        statusCode: response.statusCode,
        duration,
        traceId: response.headers?.['x-trace-id'],
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Record failure metrics
      this.recordCallMetrics(callConfig, null, duration, false, error as Error);

      // Capture error
      apmService.captureError(error as Error, {
        service: this.config.serviceName,
        operation: callConfig.operation,
        endpoint: callConfig.endpoint,
        duration,
      });

      // Set error attributes
      if (span) {
        apmService.setSpanAttribute(span, 'error', true);
        apmService.setSpanAttribute(span, 'error.message', (error as Error).message);
        apmService.endSpan(span);
      }

      return {
        success: false,
        error: (error as Error).message,
        statusCode: (error as any).response?.status || 500,
        duration,
      };
    }
  }

  /**
   * Create Python service client with automatic tracing
   */
  createTracedClient(): PythonServiceClient {
    return new PythonServiceClient(this);
  }

  /**
   * Record Python service metrics for monitoring
   */
  recordServiceMetrics(operation: string, data: any): void {
    try {
      // AI processing metrics
      if (operation.includes('ai') || operation.includes('ml')) {
        if (data.tokens) {
          businessMetrics.recordAIUsage(
            operation,
            data.model || 'python-service',
            data.tokens.prompt || 0,
            data.tokens.completion || 0,
            data.duration || 0,
            data.cost || 0,
            data.userId || 'system'
          );
        }
      }

      // File processing metrics
      if (operation.includes('file') || operation.includes('document')) {
        businessMetrics.recordFileProcessed(
          data.fileType || 'unknown',
          data.fileSize || 0,
          data.processingTime || 0,
          data.success !== false
        );
      }

      // Vector search metrics
      if (operation.includes('search') || operation.includes('vector')) {
        businessMetrics.recordSearchActivity(
          data.query || '',
          data.resultCount || 0,
          data.duration || 0,
          data.userId || 'system',
          data.searchType || 'vector'
        );
      }
    } catch (error) {
      logger.error('Error recording Python service metrics:', error);
    }
  }

  /**
   * Check Python service health
   */
  async checkHealth(): Promise<boolean> {
    if (!this.config.healthCheckEndpoint) {
      return true; // Assume healthy if no health check configured
    }

    try {
      const response = await this.makeHttpCall(
        {
          operation: 'health_check',
          endpoint: this.config.healthCheckEndpoint,
          method: 'GET',
        },
        {}
      );

      this.healthStatus = response.statusCode >= 200 && response.statusCode < 300;

      // Record health status
      apmService.recordBusinessMetric(
        'python_service.health',
        this.healthStatus ? 1 : 0,
        'boolean',
        {
          service: this.config.serviceName,
        }
      );

      return this.healthStatus;
    } catch (error) {
      this.healthStatus = false;
      logger.error(`Python service ${this.config.serviceName} health check failed:`, error);

      apmService.captureError(error as Error, {
        service: this.config.serviceName,
        operation: 'health_check',
      });

      return false;
    }
  }

  /**
   * Get service health status
   */
  isHealthy(): boolean {
    return this.healthStatus;
  }

  // Private Methods
  private prepareHeaders(baseHeaders: Record<string, string>): Record<string, string> {
    const headers = { ...baseHeaders };

    // Add service identification
    headers['X-Source-Service'] = 'learn-x-api';
    headers['X-Source-Version'] = process.env.npm_package_version || 'unknown';

    // Add trace context
    const context = distributedTracing.getCurrentContext();
    if (context) {
      headers['X-Trace-Id'] = context.traceId;
      headers['X-Span-Id'] = context.spanId;
      if (context.parentSpanId) {
        headers['X-Parent-Span-Id'] = context.parentSpanId;
      }
    }

    // Format-specific headers
    switch (this.config.traceHeaderFormat) {
      case 'w3c':
        if (context) {
          headers['traceparent'] = `00-${context.traceId}-${context.spanId}-01`;
        }
        break;

      case 'datadog':
        if (context) {
          headers['x-datadog-trace-id'] = context.traceId;
          headers['x-datadog-parent-id'] = context.spanId;
          headers['x-datadog-sampling-priority'] = '1';
        }
        break;

      case 'custom':
        // Custom headers already added above
        break;
    }

    return headers;
  }

  private async makeHttpCall(
    callConfig: PythonServiceCall,
    headers: Record<string, string>
  ): Promise<any> {
    const url = `${this.config.baseUrl}${callConfig.endpoint}`;
    const timeout = callConfig.timeout || this.config.timeout;

    const fetchOptions: RequestInit = {
      method: callConfig.method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: AbortSignal.timeout(timeout),
    };

    if (callConfig.data && ['POST', 'PUT', 'PATCH'].includes(callConfig.method)) {
      fetchOptions.body = JSON.stringify(callConfig.data);
    }

    const response = await fetch(url, fetchOptions);

    let data;
    try {
      data = await response.json();
    } catch (error) {
      data = await response.text();
    }

    return {
      data,
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  private recordCallMetrics(
    callConfig: PythonServiceCall,
    response: any,
    duration: number,
    success: boolean,
    error?: Error
  ): void {
    // Record external call
    apmService.recordExternalCall(
      this.config.serviceName,
      callConfig.operation,
      duration,
      success,
      response?.statusCode
    );

    // Record business metrics
    apmService.recordBusinessMetric('python_service.calls', 1, 'count', {
      service: this.config.serviceName,
      operation: callConfig.operation,
      method: callConfig.method,
      success: success.toString(),
    });

    apmService.recordBusinessMetric('python_service.duration', duration, 'ms', {
      service: this.config.serviceName,
      operation: callConfig.operation,
    });

    if (!success && error) {
      apmService.recordBusinessMetric('python_service.errors', 1, 'count', {
        service: this.config.serviceName,
        operation: callConfig.operation,
        error_type: error.name,
      });
    }
  }

  private startHealthChecks(): void {
    if (!this.config.healthCheckEndpoint) return;

    this.healthCheckTimer = setInterval(async () => {
      await this.checkHealth();
    }, 30000); // Every 30 seconds
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }
}

/**
 * Python Service Client with automatic tracing
 */
export class PythonServiceClient {
  constructor(private integration: PythonServiceIntegration) {}

  /**
   * AI/ML operations
   */
  async processWithAI(operation: string, data: any): Promise<PythonServiceResponse> {
    return this.integration.call({
      operation: `ai.${operation}`,
      endpoint: `/ai/${operation}`,
      method: 'POST',
      data,
    });
  }

  async generateEmbeddings(text: string, model?: string): Promise<PythonServiceResponse> {
    return this.integration.call({
      operation: 'embeddings.generate',
      endpoint: '/embeddings/generate',
      method: 'POST',
      data: { text, model },
    });
  }

  async classifyContent(content: string, categories: string[]): Promise<PythonServiceResponse> {
    return this.integration.call({
      operation: 'content.classify',
      endpoint: '/content/classify',
      method: 'POST',
      data: { content, categories },
    });
  }

  /**
   * Document processing operations
   */
  async processDocument(fileData: Buffer, fileType: string): Promise<PythonServiceResponse> {
    return this.integration.call({
      operation: 'document.process',
      endpoint: '/document/process',
      method: 'POST',
      data: {
        file: fileData.toString('base64'),
        type: fileType,
      },
    });
  }

  async extractText(fileData: Buffer, fileType: string): Promise<PythonServiceResponse> {
    return this.integration.call({
      operation: 'document.extract_text',
      endpoint: '/document/extract-text',
      method: 'POST',
      data: {
        file: fileData.toString('base64'),
        type: fileType,
      },
    });
  }

  /**
   * Vector search operations
   */
  async vectorSearch(query: string, options: any = {}): Promise<PythonServiceResponse> {
    return this.integration.call({
      operation: 'search.vector',
      endpoint: '/search/vector',
      method: 'POST',
      data: { query, ...options },
    });
  }

  async semanticSearch(query: string, options: any = {}): Promise<PythonServiceResponse> {
    return this.integration.call({
      operation: 'search.semantic',
      endpoint: '/search/semantic',
      method: 'POST',
      data: { query, ...options },
    });
  }

  /**
   * Health check
   */
  async health(): Promise<PythonServiceResponse> {
    return this.integration.call({
      operation: 'health',
      endpoint: '/health',
      method: 'GET',
    });
  }
}

/**
 * Decorator for automatic Python service call tracing
 */
export function tracePythonCall(serviceName: string, operation?: string) {
  return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const actualOperation = operation || propertyKey;

    descriptor.value = async function (...args: any[]) {
      const span = apmService.startSpan(`python.${serviceName}.${actualOperation}`);
      const startTime = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Record metrics
        apmService.recordExternalCall(serviceName, actualOperation, duration, true);

        if (span) {
          apmService.setSpanAttribute(span, 'service.name', serviceName);
          apmService.setSpanAttribute(span, 'operation', actualOperation);
          apmService.setSpanAttribute(span, 'duration', duration);
          apmService.endSpan(span);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        apmService.recordExternalCall(serviceName, actualOperation, duration, false);
        apmService.captureError(error as Error, {
          service: serviceName,
          operation: actualOperation,
          duration,
        });

        if (span) {
          apmService.setSpanAttribute(span, 'error', true);
          apmService.setSpanAttribute(span, 'error.message', (error as Error).message);
          apmService.endSpan(span);
        }

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Factory function for creating Python service integrations
 */
export function createPythonServiceIntegration(
  serviceName: string,
  config: Omit<PythonServiceConfig, 'serviceName'>
): PythonServiceIntegration {
  const fullConfig: PythonServiceConfig = {
    serviceName,
    ...config,
  };

  return PythonServiceIntegration.getInstance(serviceName, fullConfig);
}

// Pre-configured integrations
export const pythonServices = {
  ai: createPythonServiceIntegration('ai-service', {
    baseUrl: process.env.AI_SERVICE_URL || 'http://localhost:8001',
    timeout: 30000,
    retryAttempts: 3,
    healthCheckEndpoint: '/health',
    traceHeaderFormat: 'w3c',
  }),

  vectorSearch: createPythonServiceIntegration('vector-search', {
    baseUrl: process.env.VECTOR_SEARCH_URL || 'http://localhost:8002',
    timeout: 10000,
    retryAttempts: 2,
    healthCheckEndpoint: '/health',
    traceHeaderFormat: 'datadog',
  }),

  documentProcessor: createPythonServiceIntegration('document-processor', {
    baseUrl: process.env.DOCUMENT_PROCESSOR_URL || 'http://localhost:8003',
    timeout: 60000,
    retryAttempts: 2,
    healthCheckEndpoint: '/health',
    traceHeaderFormat: 'custom',
  }),
};
