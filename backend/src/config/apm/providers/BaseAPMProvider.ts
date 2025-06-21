/**
 * Base APM Provider
 * Abstract base class for all APM providers
 */

import type { APMProvider } from '../types';

export abstract class BaseAPMProvider implements APMProvider {
  protected providerName: string;

  constructor(name: string) {
    this.providerName = name;
  }

  abstract initialize(): Promise<void>;
  abstract isEnabled(): boolean;

  // These methods must be implemented by concrete providers
  abstract startTransaction(name: string, type?: string): any;
  abstract endTransaction(transaction: any): void;
  abstract startSpan(name: string, parentTransaction?: any): any;
  abstract endSpan(span: any): void;
  abstract captureError(error: any): void;
  abstract recordMetric(metric: any): void;
  abstract setTransactionAttribute(key: string, value: any): void;
  abstract setSpanAttribute(span: any, key: string, value: any): void;
  abstract recordBusinessMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>
  ): void;
  abstract setUser(userId: string, attributes?: Record<string, any>): void;
  abstract recordCustomEvent(eventType: string, attributes: Record<string, any>): void;
  abstract recordDatabaseQuery(query: string, duration: number, database: string): void;
  abstract recordExternalCall(
    service: string,
    operation: string,
    duration: number,
    success: boolean
  ): void;
  abstract recordFeatureUsage(
    feature: string,
    userId: string,
    metadata?: Record<string, any>
  ): void;
  abstract checkPerformanceBudget(metric: string, value: number, budget: number): void;

  getProviderName(): string {
    return this.providerName;
  }
}
