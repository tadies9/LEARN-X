/**
 * Enhanced APM Service
 * Manages APM providers and provides unified interface
 */

import { logger } from '../../utils/logger';
import { NewRelicProvider } from './providers/NewRelicProvider';
import { DatadogProvider } from './providers/DatadogProvider';
import type { 
  APMProvider, 
  APMConfig, 
  APMTransaction, 
  APMSpan, 
  APMError,
  PerformanceBudget 
} from './types';

export class APMService {
  private static instance: APMService;
  private provider: APMProvider | null = null;
  private config: APMConfig;
  private performanceBudgets: Map<string, PerformanceBudget> = new Map();
  private transactionStore: Map<string, APMTransaction> = new Map();

  private constructor() {
    this.config = {
      provider: (process.env.APM_PROVIDER as APMConfig['provider']) || 'none',
      enabled: process.env.APM_ENABLED === 'true',
      serviceName: process.env.APM_SERVICE_NAME || 'learn-x-api',
      environment: process.env.NODE_ENV || 'development',
      customTags: {
        version: process.env.npm_package_version || 'unknown',
        region: process.env.AWS_REGION || process.env.VERCEL_REGION || 'unknown'
      }
    };

    this.initializePerformanceBudgets();
  }

  static getInstance(): APMService {
    if (!APMService.instance) {
      APMService.instance = new APMService();
    }
    return APMService.instance;
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled || this.config.provider === 'none') {
      logger.info('📊 APM disabled or no provider configured');
      return;
    }

    try {
      switch (this.config.provider) {
        case 'newrelic':
          this.provider = new NewRelicProvider();
          break;
        case 'datadog':
          this.provider = new DatadogProvider();
          break;
        default:
          logger.warn(`Unknown APM provider: ${this.config.provider}`);
          return;
      }

      await this.provider.initialize();
      logger.info(`📊 APM Service initialized with ${this.config.provider}`);
    } catch (error) {
      logger.error('Failed to initialize APM Service:', error);
    }
  }

  // Transaction Management
  startTransaction(name: string, type: string = 'web'): APMTransaction | null {
    if (!this.provider?.isEnabled()) return null;

    const transaction = this.provider.startTransaction(name, type);
    
    // Store transaction for correlation
    const transactionKey = `${name}_${transaction.id}`;
    this.transactionStore.set(transactionKey, transaction);

    // Set default attributes
    this.provider.setTransactionAttribute('service.name', this.config.serviceName);
    this.provider.setTransactionAttribute('environment', this.config.environment);
    
    if (this.config.customTags) {
      Object.entries(this.config.customTags).forEach(([key, value]) => {
        this.provider!.setTransactionAttribute(key, value);
      });
    }

    return transaction;
  }

  endTransaction(transaction: APMTransaction | null): void {
    if (!transaction || !this.provider?.isEnabled()) return;

    const duration = Date.now() - transaction.startTime;
    
    // Check performance budgets
    this.checkTransactionPerformance(transaction.name, duration);
    
    // Record transaction metrics
    this.provider.recordMetric({
      name: `transaction.duration.${transaction.type}`,
      value: duration,
      type: 'histogram',
      tags: {
        transaction: transaction.name,
        type: transaction.type
      }
    });

    this.provider.endTransaction(transaction);
    
    // Clean up stored transaction
    const transactionKey = `${transaction.name}_${transaction.id}`;
    this.transactionStore.delete(transactionKey);
  }

  // Span Management
  startSpan(name: string, parentTransaction?: APMTransaction): APMSpan | null {
    if (!this.provider?.isEnabled()) return null;
    return this.provider.startSpan(name, parentTransaction);
  }

  endSpan(span: APMSpan | null): void {
    if (!span || !this.provider?.isEnabled()) return;

    const duration = Date.now() - span.startTime;
    
    // Record span metrics
    this.provider.recordMetric({
      name: 'span.duration',
      value: duration,
      type: 'histogram',
      tags: {
        span: span.name
      }
    });

    this.provider.endSpan(span);
  }

  // Attribute Management
  setSpanAttribute(span: APMSpan | null, key: string, value: any): void {
    if (!span || !this.provider?.isEnabled()) return;
    this.provider.setSpanAttribute(span, key, value);
  }

  setTransactionAttribute(key: string, value: any): void {
    if (!this.provider?.isEnabled()) return;
    this.provider.setTransactionAttribute(key, value);
  }

  // Error Tracking
  captureError(error: Error, context?: Record<string, any>): void {
    if (!this.provider?.isEnabled()) return;

    const apmError: APMError = {
      error,
      userId: context?.userId,
      correlationId: context?.correlationId,
      context: {
        ...context,
        service: this.config.serviceName,
        environment: this.config.environment
      }
    };

    this.provider.captureError(apmError);
    
    // Increment error counter
    this.provider.recordMetric({
      name: 'errors.count',
      value: 1,
      type: 'counter',
      tags: {
        error_type: error.name,
        service: this.config.serviceName
      }
    });
  }

  // Business Metrics
  recordBusinessMetric(name: string, value: number, unit: string = 'count', tags?: Record<string, string>): void {
    if (!this.provider?.isEnabled()) return;
    
    this.provider.recordBusinessMetric(name, value, unit, {
      ...tags,
      service: this.config.serviceName,
      environment: this.config.environment
    });
  }

  // User Tracking
  setUser(userId: string, attributes?: Record<string, any>): void {
    if (!this.provider?.isEnabled()) return;
    this.provider.setUser(userId, attributes);
  }

  // Custom Events
  recordEvent(eventType: string, attributes: Record<string, any>): void {
    if (!this.provider?.isEnabled()) return;
    
    this.provider.recordCustomEvent(eventType, {
      ...attributes,
      timestamp: Date.now(),
      service: this.config.serviceName,
      environment: this.config.environment
    });
  }

  // Database Operations
  recordDatabaseQuery(query: string, duration: number, database: string = 'postgres'): void {
    if (!this.provider?.isEnabled()) return;
    
    this.provider.recordDatabaseQuery(query, duration, database);
    
    // Check slow query threshold
    if (duration > 1000) { // 1 second
      this.captureError(new Error('Slow database query detected'), {
        query: query.substring(0, 500),
        duration,
        database
      });
    }
  }

  // External Service Calls
  recordExternalCall(service: string, operation: string, duration: number, success: boolean = true, statusCode?: number): void {
    if (!this.provider?.isEnabled()) return;
    
    this.provider.recordExternalCall(service, operation, duration, success);
    
    // Track status codes
    if (statusCode) {
      this.provider.recordMetric({
        name: 'external.status_code',
        value: 1,
        type: 'counter',
        tags: {
          service,
          operation,
          status_code: statusCode.toString(),
          status_class: `${Math.floor(statusCode / 100)}xx`
        }
      });
    }
  }

  // Feature Usage
  recordFeatureUsage(feature: string, userId: string, metadata?: Record<string, any>): void {
    if (!this.provider?.isEnabled()) return;
    
    this.provider.recordFeatureUsage(feature, userId, {
      ...metadata,
      timestamp: Date.now()
    });
  }

  // Queue Metrics
  recordQueueMetric(queueName: string, metric: 'enqueue' | 'dequeue' | 'process' | 'error' | 'retry', value: number = 1, metadata?: Record<string, any>): void {
    if (!this.provider?.isEnabled()) return;
    
    this.provider.recordMetric({
      name: `queue.${metric}`,
      value,
      type: (metric === 'error' || metric === 'retry') ? 'counter' : 'histogram',
      tags: {
        queue: queueName,
        ...metadata
      }
    });
  }

  // AI Service Metrics
  recordAIMetric(operation: string, model: string, tokens: number, duration: number, cost?: number): void {
    if (!this.provider?.isEnabled()) return;
    
    // Token usage
    this.provider.recordMetric({
      name: 'ai.tokens',
      value: tokens,
      type: 'counter',
      tags: {
        operation,
        model
      }
    });

    // Duration
    this.provider.recordMetric({
      name: 'ai.duration',
      value: duration,
      type: 'histogram',
      tags: {
        operation,
        model
      }
    });

    // Cost tracking
    if (cost !== undefined) {
      this.recordBusinessMetric('ai.cost', cost, 'usd', {
        operation,
        model
      });
    }
  }

  // Cache Metrics
  recordCacheMetric(operation: 'hit' | 'miss' | 'set' | 'delete', cacheType: string, duration?: number): void {
    if (!this.provider?.isEnabled()) return;
    
    this.provider.recordMetric({
      name: `cache.${operation}`,
      value: 1,
      type: 'counter',
      tags: {
        cache_type: cacheType
      }
    });

    if (duration !== undefined) {
      this.provider.recordMetric({
        name: 'cache.operation.duration',
        value: duration,
        type: 'histogram',
        tags: {
          operation,
          cache_type: cacheType
        }
      });
    }
  }

  // Performance Budget Management
  setPerformanceBudget(metric: string, budget: number, unit: string = 'ms', critical: boolean = false): void {
    this.performanceBudgets.set(metric, {
      metric,
      budget,
      unit,
      critical
    });
  }

  private checkTransactionPerformance(transactionName: string, duration: number): void {
    const budget = this.performanceBudgets.get(transactionName);
    if (budget && this.provider?.isEnabled()) {
      this.provider.checkPerformanceBudget(transactionName, duration, budget.budget);
    }
  }

  private initializePerformanceBudgets(): void {
    // Default performance budgets
    this.setPerformanceBudget('api.response', 200, 'ms');
    this.setPerformanceBudget('database.query', 100, 'ms');
    this.setPerformanceBudget('ai.generation', 5000, 'ms');
    this.setPerformanceBudget('file.processing', 10000, 'ms');
    this.setPerformanceBudget('search.query', 500, 'ms');
  }

  // Utility Methods
  isEnabled(): boolean {
    return this.provider?.isEnabled() || false;
  }

  getProvider(): string {
    return this.config.provider;
  }
}

// Export singleton instance
export const apmService = APMService.getInstance();