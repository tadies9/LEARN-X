/**
 * Datadog APM Provider
 * Implements comprehensive monitoring with Datadog
 */

import { logger } from '../../../utils/logger';
import { BaseAPMProvider } from './BaseAPMProvider';
import type { APMTransaction, APMSpan, APMMetric, APMError, APMProvider } from '../types';

export class DatadogProvider extends BaseAPMProvider implements APMProvider {
  private tracer: any;
  private dogstatsd: any;
  private initialized = false;

  constructor() {
    super('datadog');
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Datadog tracer
      const ddTrace = require('dd-trace');
      this.tracer = ddTrace.init({
        service: process.env.DD_SERVICE || 'learn-x-api',
        env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
        version: process.env.DD_VERSION || process.env.npm_package_version,
        analytics: true,
        logInjection: true,
        runtimeMetrics: true,
        profiling: true,
        tags: {
          team: 'backend',
          component: 'api',
        },
      });

      // Initialize DogStatsD for custom metrics
      const StatsD = require('node-dogstatsd').StatsD;
      this.dogstatsd = new StatsD(process.env.DD_AGENT_HOST || 'localhost', 8125);

      this.initialized = true;
      logger.info('✅ Datadog APM provider initialized');
    } catch (error) {
      logger.error('Failed to initialize Datadog provider:', error);
      throw error;
    }
  }

  isEnabled(): boolean {
    return this.initialized && this.tracer;
  }

  // Transaction Management
  startTransaction(name: string, type: string = 'web'): APMTransaction {
    if (!this.isEnabled()) return this.createDummyTransaction(name);

    const span = this.tracer.startSpan(name, {
      type,
      resource: name,
      tags: {
        'span.type': type,
        'resource.name': name,
      },
    });

    return {
      id: span.context().toSpanId(),
      name,
      type,
      startTime: Date.now(),
      _span: span,
    };
  }

  endTransaction(transaction: APMTransaction): void {
    if (!this.isEnabled() || !transaction._span) return;

    try {
      transaction._span.finish();
    } catch (error) {
      logger.error('Error ending Datadog transaction:', error);
    }
  }

  // Span Management
  startSpan(name: string, parentTransaction?: APMTransaction): APMSpan {
    if (!this.isEnabled()) return this.createDummySpan(name);

    const options: any = {
      resource: name,
      type: 'custom',
    };

    if (parentTransaction?._span) {
      options.childOf = parentTransaction._span;
    }

    const span = this.tracer.startSpan(name, options);

    return {
      id: span.context().toSpanId(),
      name,
      startTime: Date.now(),
      _span: span,
    };
  }

  endSpan(span: APMSpan): void {
    if (!this.isEnabled() || !span._span) return;

    try {
      span._span.finish();
      span.endTime = Date.now();
    } catch (error) {
      logger.error('Error ending Datadog span:', error);
    }
  }

  // Error Tracking
  captureError(error: APMError): void {
    if (!this.isEnabled()) return;

    const activeSpan = this.tracer.scope().active();
    if (activeSpan) {
      activeSpan.setTag('error', true);
      activeSpan.setTag('error.type', error.error.name);
      activeSpan.setTag('error.message', error.error.message);
      activeSpan.setTag('error.stack', error.error.stack);

      if (error.userId) {
        activeSpan.setTag('user.id', error.userId);
      }

      if (error.correlationId) {
        activeSpan.setTag('correlation.id', error.correlationId);
      }

      // Add context as tags
      if (error.context) {
        Object.entries(error.context).forEach(([key, value]) => {
          activeSpan.setTag(`error.context.${key}`, value);
        });
      }
    }
  }

  // Custom Metrics
  recordMetric(metric: APMMetric): void {
    if (!this.isEnabled() || !this.dogstatsd) return;

    const tags = metric.tags ? Object.entries(metric.tags).map(([k, v]) => `${k}:${v}`) : [];

    switch (metric.type) {
      case 'counter':
        this.dogstatsd.increment(metric.name, metric.value, tags);
        break;
      case 'gauge':
        this.dogstatsd.gauge(metric.name, metric.value, tags);
        break;
      case 'histogram':
        this.dogstatsd.histogram(metric.name, metric.value, tags);
        break;
      case 'distribution':
        this.dogstatsd.distribution(metric.name, metric.value, tags);
        break;
    }
  }

  // Custom Attributes
  setTransactionAttribute(key: string, value: any): void {
    if (!this.isEnabled()) return;

    const activeSpan = this.tracer.scope().active();
    if (activeSpan) {
      activeSpan.setTag(key, value);
    }
  }

  setSpanAttribute(span: APMSpan, key: string, value: any): void {
    if (!this.isEnabled() || !span._span) return;
    span._span.setTag(key, value);
  }

  // Business Metrics
  recordBusinessMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>
  ): void {
    if (!this.isEnabled() || !this.dogstatsd) return;

    const metricTags = ['unit:' + unit];
    if (tags) {
      Object.entries(tags).forEach(([k, v]) => {
        metricTags.push(`${k}:${v}`);
      });
    }

    this.dogstatsd.gauge(`business.${name}`, value, metricTags);

    // Also record as a distribution for percentiles
    this.dogstatsd.distribution(`business.${name}.distribution`, value, metricTags);
  }

  // User Tracking
  setUser(userId: string, attributes?: Record<string, any>): void {
    if (!this.isEnabled()) return;

    const activeSpan = this.tracer.scope().active();
    if (activeSpan) {
      activeSpan.setTag('user.id', userId);

      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          activeSpan.setTag(`user.${key}`, value);
        });
      }
    }
  }

  // Custom Events
  recordCustomEvent(eventType: string, attributes: Record<string, any>): void {
    if (!this.isEnabled() || !this.dogstatsd) return;

    // Record as a metric event
    this.dogstatsd.event(eventType, JSON.stringify(attributes), {
      alert_type: 'info',
      tags: Object.entries(attributes)
        .filter(([_, v]) => typeof v === 'string' || typeof v === 'number')
        .map(([k, v]) => `${k}:${v}`),
    });

    // Also track as a counter
    this.dogstatsd.increment(`events.${eventType}`);
  }

  // Database Query Tracking
  recordDatabaseQuery(query: string, duration: number, database: string): void {
    if (!this.isEnabled()) return;

    const activeSpan = this.tracer.scope().active();
    if (activeSpan) {
      const querySpan = this.tracer.startSpan('db.query', {
        childOf: activeSpan,
        tags: {
          'db.type': 'sql',
          'db.instance': database,
          'db.statement': query.substring(0, 1000),
          'span.type': 'db',
          'resource.name': query.split(' ')[0], // First word (SELECT, INSERT, etc.)
        },
      });

      querySpan.finish();
    }

    // Record query metrics
    if (this.dogstatsd) {
      this.dogstatsd.histogram('db.query.duration', duration, [`database:${database}`]);
      this.dogstatsd.increment('db.query.count', 1, [`database:${database}`]);
    }
  }

  // External Service Tracking
  recordExternalCall(service: string, operation: string, duration: number, success: boolean): void {
    if (!this.isEnabled()) return;

    if (this.dogstatsd) {
      const tags = [`service:${service}`, `operation:${operation}`, `success:${success}`];

      this.dogstatsd.histogram('external.call.duration', duration, tags);
      this.dogstatsd.increment('external.call.count', 1, tags);

      if (!success) {
        this.dogstatsd.increment('external.call.error', 1, tags);
      }
    }
  }

  // Feature Usage Tracking
  recordFeatureUsage(feature: string, userId: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled() || !this.dogstatsd) return;

    const tags = [`feature:${feature}`, `user:${userId}`];

    if (metadata) {
      Object.entries(metadata)
        .filter(([_, v]) => typeof v === 'string' || typeof v === 'number')
        .forEach(([k, v]) => tags.push(`${k}:${v}`));
    }

    this.dogstatsd.increment('feature.usage', 1, tags);
  }

  // Performance Budgets
  checkPerformanceBudget(metric: string, value: number, budget: number): void {
    if (!this.isEnabled() || !this.dogstatsd) return;

    const exceeded = value > budget;
    const percentage = (value / budget) * 100;

    this.dogstatsd.gauge(`performance.budget.${metric}`, percentage, [
      `exceeded:${exceeded}`,
      `metric:${metric}`,
    ]);

    if (exceeded) {
      this.dogstatsd.event(
        'Performance Budget Exceeded',
        `Metric ${metric} exceeded budget: ${value}ms (budget: ${budget}ms)`,
        {
          alert_type: 'warning',
          tags: [`metric:${metric}`, `value:${value}`, `budget:${budget}`],
        }
      );
    }
  }

  // Helper methods
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
