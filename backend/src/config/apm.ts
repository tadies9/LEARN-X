/**
 * APM (Application Performance Monitoring) Configuration
 * Supports multiple APM providers with free tier options
 */

import { logger } from '../utils/logger';

export interface APMConfig {
  provider: 'newrelic' | 'datadog' | 'elastic' | 'none';
  enabled: boolean;
  serviceName: string;
  environment: string;
}

export class APMService {
  private config: APMConfig;
  private apmAgent: any;

  constructor() {
    this.config = {
      provider: (process.env.APM_PROVIDER as APMConfig['provider']) || 'none',
      enabled: process.env.APM_ENABLED === 'true',
      serviceName: process.env.APM_SERVICE_NAME || 'learn-x-api',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  initialize(): void {
    if (!this.config.enabled || this.config.provider === 'none') {
      logger.info('📊 APM disabled or no provider configured');
      return;
    }

    try {
      switch (this.config.provider) {
        case 'newrelic':
          this.initializeNewRelic();
          break;
        case 'datadog':
          this.initializeDatadog();
          break;
        case 'elastic':
          this.initializeElasticAPM();
          break;
        default:
          logger.warn(`Unknown APM provider: ${this.config.provider}`);
      }
    } catch (error) {
      logger.error('Failed to initialize APM:', error);
    }
  }

  private initializeNewRelic(): void {
    if (!process.env.NEW_RELIC_LICENSE_KEY) {
      logger.warn('New Relic license key not provided');
      return;
    }

    // New Relic needs to be required at the very start of the app
    // This is typically done in a separate newrelic.js file
    logger.info('📊 New Relic APM configured (requires app restart with newrelic module)');
  }

  private initializeDatadog(): void {
    if (!process.env.DD_API_KEY) {
      logger.warn('Datadog API key not provided');
      return;
    }

    try {
      const tracer = require('dd-trace').init({
        service: this.config.serviceName,
        env: this.config.environment,
        version: process.env.npm_package_version,
        analytics: true,
        logInjection: true,
        runtimeMetrics: true,
        profiling: true,
      });

      this.apmAgent = tracer;
      logger.info('📊 Datadog APM initialized');
    } catch (error) {
      logger.error('Failed to initialize Datadog:', error);
    }
  }

  private initializeElasticAPM(): void {
    if (!process.env.ELASTIC_APM_SECRET_TOKEN) {
      logger.warn('Elastic APM secret token not provided');
      return;
    }

    try {
      const apm = require('elastic-apm-node').start({
        serviceName: this.config.serviceName,
        secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
        serverUrl: process.env.ELASTIC_APM_SERVER_URL || 'http://localhost:8200',
        environment: this.config.environment,
        captureBody: 'all',
        captureHeaders: true,
        transactionSampleRate: 1.0,
        metricsInterval: '30s',
      });

      this.apmAgent = apm;
      logger.info('📊 Elastic APM initialized');
    } catch (error) {
      logger.error('Failed to initialize Elastic APM:', error);
    }
  }

  // Custom transaction tracking
  startTransaction(name: string, type: string = 'custom'): any {
    if (!this.apmAgent || !this.config.enabled) return null;

    switch (this.config.provider) {
      case 'elastic':
        return this.apmAgent.startTransaction(name, type);
      case 'datadog':
        const span = this.apmAgent.scope().active();
        return span ? span.addTags({ transaction: name, type }) : null;
      default:
        return null;
    }
  }

  // Custom span tracking
  startSpan(name: string): any {
    if (!this.apmAgent || !this.config.enabled) return null;

    switch (this.config.provider) {
      case 'elastic':
        return this.apmAgent.startSpan(name);
      case 'datadog':
        return this.apmAgent.startSpan(name);
      default:
        return null;
    }
  }

  // Capture errors
  captureError(error: Error, context?: Record<string, any>): void {
    if (!this.apmAgent || !this.config.enabled) return;

    switch (this.config.provider) {
      case 'elastic':
        this.apmAgent.captureError(error, { custom: context });
        break;
      case 'datadog':
        const span = this.apmAgent.scope().active();
        if (span) {
          span.setTag('error', true);
          span.setTag('error.message', error.message);
          span.setTag('error.stack', error.stack);
        }
        break;
    }
  }

  // Add custom metrics
  addMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.apmAgent || !this.config.enabled) return;

    switch (this.config.provider) {
      case 'datadog':
        const dogstatsd = require('node-dogstatsd').StatsD;
        const client = new dogstatsd();
        client.gauge(name, value, tags);
        break;
      case 'elastic':
        // Elastic APM handles metrics automatically
        break;
    }
  }
}

// Export singleton instance
export const apmService = new APMService();