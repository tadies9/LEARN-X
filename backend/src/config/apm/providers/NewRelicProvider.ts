/**
 * New Relic APM Provider
 * Implements comprehensive monitoring with New Relic's free tier
 */

import { logger } from '../../../utils/logger';
import { BaseAPMProvider } from './BaseAPMProvider';
import type { APMTransaction, APMSpan, APMMetric, APMError, APMProvider } from '../types';

export class NewRelicProvider extends BaseAPMProvider implements APMProvider {
  private api: any;
  private initialized = false;

  constructor() {
    super('newrelic');
  }

  async initialize(): Promise<void> {
    try {
      // New Relic must be required at app start, check if it's available
      if ((global as any).newrelic) {
        this.api = (global as any).newrelic;
        this.initialized = true;
        logger.info('✅ New Relic APM provider initialized');
      } else {
        logger.warn('⚠️ New Relic agent not found. Ensure newrelic is required at app start');
      }
    } catch (error) {
      logger.error('Failed to initialize New Relic provider:', error);
      throw error;
    }
  }

  isEnabled(): boolean {
    return this.initialized && this.api;
  }

  // Transaction Management
  startTransaction(name: string, type: string = 'web'): APMTransaction {
    if (!this.isEnabled()) return this.createDummyTransaction(name);

    const handle = this.api.startBackgroundTransaction(name, () => {
      const transaction = this.api.getTransaction();
      return {
        id: transaction.id,
        name,
        type,
        startTime: Date.now(),
        _handle: transaction,
      };
    });

    return handle;
  }

  endTransaction(transaction: APMTransaction): void {
    if (!this.isEnabled() || !transaction._handle) return;

    try {
      transaction._handle.end();
    } catch (error) {
      logger.error('Error ending New Relic transaction:', error);
    }
  }

  // Span Management
  startSpan(name: string, _parentTransaction?: APMTransaction): APMSpan {
    if (!this.isEnabled()) return this.createDummySpan(name);

    const segment = this.api.startSegment(name, true, () => {
      return {
        id: `span_${Date.now()}`,
        name,
        startTime: Date.now(),
        _segment: true,
      };
    });

    return segment;
  }

  endSpan(span: APMSpan): void {
    // New Relic segments end automatically when the callback completes
    if (!this.isEnabled() || !span._segment) return;

    // Mark span as completed
    span.endTime = Date.now();
  }

  // Error Tracking
  captureError(error: APMError): void {
    if (!this.isEnabled()) return;

    this.api.noticeError(error.error, {
      customAttributes: {
        userId: error.userId,
        correlationId: error.correlationId,
        ...error.context,
      },
    });
  }

  // Custom Metrics
  recordMetric(metric: APMMetric): void {
    if (!this.isEnabled()) return;

    switch (metric.type) {
      case 'counter':
        this.api.incrementMetric(`Custom/${metric.name}`, metric.value);
        break;
      case 'gauge':
        this.api.recordMetric(`Custom/${metric.name}`, metric.value);
        break;
      case 'histogram':
        this.api.recordMetric(`Custom/${metric.name}`, metric.value);
        break;
    }

    // Add custom attributes if provided
    if (metric.tags) {
      Object.entries(metric.tags).forEach(([key, value]) => {
        this.api.addCustomAttribute(key, value);
      });
    }
  }

  // Custom Attributes
  setTransactionAttribute(key: string, value: any): void {
    if (!this.isEnabled()) return;
    this.api.addCustomAttribute(key, value);
  }

  setSpanAttribute(_span: APMSpan, key: string, value: any): void {
    if (!this.isEnabled()) return;
    this.api.addCustomSpanAttribute(key, value);
  }

  // Business Metrics
  recordBusinessMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>
  ): void {
    if (!this.isEnabled()) return;

    const metricName = `Business/${name}`;
    this.api.recordMetric(metricName, value);

    // Record additional context
    if (tags) {
      this.api.recordCustomEvent('BusinessMetric', {
        metric: name,
        value,
        unit,
        ...tags,
      });
    }
  }

  // User Tracking
  setUser(userId: string, attributes?: Record<string, any>): void {
    if (!this.isEnabled()) return;

    this.api.setUserID(userId);

    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        this.api.addCustomAttribute(`user.${key}`, value);
      });
    }
  }

  // Custom Events
  recordCustomEvent(eventType: string, attributes: Record<string, any>): void {
    if (!this.isEnabled()) return;

    this.api.recordCustomEvent(eventType, {
      timestamp: Date.now(),
      ...attributes,
    });
  }

  // Database Query Tracking
  recordDatabaseQuery(query: string, duration: number, database: string): void {
    if (!this.isEnabled()) return;

    this.api.recordCustomEvent('DatabaseQuery', {
      query: query.substring(0, 1000), // Limit query length
      duration,
      database,
      timestamp: Date.now(),
    });
  }

  // External Service Tracking
  recordExternalCall(service: string, operation: string, duration: number, success: boolean): void {
    if (!this.isEnabled()) return;

    this.api.recordCustomEvent('ExternalServiceCall', {
      service,
      operation,
      duration,
      success,
      timestamp: Date.now(),
    });
  }

  // Feature Usage Tracking
  recordFeatureUsage(feature: string, userId: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled()) return;

    this.api.recordCustomEvent('FeatureUsage', {
      feature,
      userId,
      timestamp: Date.now(),
      ...metadata,
    });
  }

  // Performance Budgets
  checkPerformanceBudget(metric: string, value: number, budget: number): void {
    if (!this.isEnabled()) return;

    const exceeded = value > budget;

    this.api.recordCustomEvent('PerformanceBudget', {
      metric,
      value,
      budget,
      exceeded,
      percentage: (value / budget) * 100,
      timestamp: Date.now(),
    });

    if (exceeded) {
      this.api.noticeError(new Error(`Performance budget exceeded for ${metric}`), {
        customAttributes: {
          metric,
          value,
          budget,
          exceeded: value - budget,
        },
      });
    }
  }

  // Helper method to create dummy objects for when APM is disabled
  private createDummyTransaction(name: string): APMTransaction {
    return {
      id: `dummy_${Date.now()}`,
      name,
      type: 'dummy',
      startTime: Date.now(),
    };
  }

  private createDummySpan(name: string): APMSpan {
    return {
      id: `dummy_span_${Date.now()}`,
      name,
      startTime: Date.now(),
    };
  }
}
