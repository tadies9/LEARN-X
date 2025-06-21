/**
 * APM Type Definitions
 * Common types used across all APM providers
 */

export interface APMTransaction {
  id: string;
  name: string;
  type: string;
  startTime: number;
  endTime?: number;
  _handle?: any; // Provider-specific handle
  _span?: any; // For providers that use spans for transactions
}

export interface APMSpan {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  _segment?: any; // Provider-specific segment
  _span?: any; // Provider-specific span
}

export interface APMError {
  error: Error;
  userId?: string;
  correlationId?: string;
  context?: Record<string, any>;
}

export interface APMMetric {
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram' | 'distribution';
  tags?: Record<string, string>;
  timestamp?: number;
}

export interface APMProvider {
  initialize(): Promise<void>;
  isEnabled(): boolean;

  // Transaction management
  startTransaction(name: string, type?: string): APMTransaction;
  endTransaction(transaction: APMTransaction): void;

  // Span management
  startSpan(name: string, parentTransaction?: APMTransaction): APMSpan;
  endSpan(span: APMSpan): void;

  // Error tracking
  captureError(error: APMError): void;

  // Metrics
  recordMetric(metric: APMMetric): void;
  recordBusinessMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>
  ): void;

  // Attributes
  setTransactionAttribute(key: string, value: any): void;
  setSpanAttribute(span: APMSpan, key: string, value: any): void;

  // User tracking
  setUser(userId: string, attributes?: Record<string, any>): void;

  // Custom events
  recordCustomEvent(eventType: string, attributes: Record<string, any>): void;

  // Specialized tracking
  recordDatabaseQuery(query: string, duration: number, database: string): void;
  recordExternalCall(service: string, operation: string, duration: number, success: boolean): void;
  recordFeatureUsage(feature: string, userId: string, metadata?: Record<string, any>): void;

  // Performance monitoring
  checkPerformanceBudget(metric: string, value: number, budget: number): void;
}

export interface APMConfig {
  provider: 'newrelic' | 'datadog' | 'elastic' | 'none';
  enabled: boolean;
  serviceName: string;
  environment: string;
  customTags?: Record<string, string>;
}

export interface DistributedTracingContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
}

export interface PerformanceBudget {
  metric: string;
  budget: number;
  unit: string;
  critical?: boolean;
}

export interface BusinessMetricDefinition {
  name: string;
  description: string;
  unit: string;
  type: 'counter' | 'gauge' | 'rate';
  tags?: string[];
}
