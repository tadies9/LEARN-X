/**
 * APM Health Check and Configuration Validation
 * Ensures APM services are properly configured and functioning
 */

import { logger } from '../../../utils/logger';
import { apmService } from '../APMService';
import { apmAlerting } from '../alerting/APMAlertingService';
import { unifiedObservability } from '../observability/UnifiedObservabilityService';
import { apmDashboard } from '../dashboard/APMDashboardService';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  responseTime?: number;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface APMSystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  services: HealthCheckResult[];
  configuration: ConfigValidationResult;
  lastCheck: Date;
  uptime: number;
}

export class APMHealthCheck {
  private static instance: APMHealthCheck;
  private healthCheckInterval?: NodeJS.Timeout;
  private lastHealthCheck?: APMSystemHealth;
  private startTime: Date = new Date();

  private constructor() {}

  static getInstance(): APMHealthCheck {
    if (!APMHealthCheck.instance) {
      APMHealthCheck.instance = new APMHealthCheck();
    }
    return APMHealthCheck.instance;
  }

  /**
   * Initialize health checking
   */
  initialize(): void {
    logger.info('🏥 APM Health Check initialized');
    this.startPeriodicHealthChecks();
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<APMSystemHealth> {
    const startTime = Date.now();

    try {
      const services = await Promise.all([
        this.checkAPMService(),
        this.checkAlertingService(),
        this.checkObservabilityService(),
        this.checkDashboardService(),
        this.checkProviderConnectivity(),
        this.checkMetricsCollection(),
        this.checkTraceCollection(),
      ]);

      const configuration = this.validateConfiguration();
      const overall = this.determineOverallHealth(services, configuration);

      this.lastHealthCheck = {
        overall,
        services,
        configuration,
        lastCheck: new Date(),
        uptime: Date.now() - this.startTime.getTime(),
      };

      const duration = Date.now() - startTime;
      logger.info(`APM health check completed in ${duration}ms - Status: ${overall}`);

      return this.lastHealthCheck;
    } catch (error) {
      logger.error('Error performing APM health check:', error);

      return {
        overall: 'critical',
        services: [
          {
            service: 'health_check',
            status: 'critical',
            message: 'Health check failed to execute',
            details: { error: (error as Error).message },
            timestamp: new Date(),
          },
        ],
        configuration: {
          valid: false,
          errors: ['Health check execution failed'],
          warnings: [],
          recommendations: [],
        },
        lastCheck: new Date(),
        uptime: Date.now() - this.startTime.getTime(),
      };
    }
  }

  /**
   * Get last health check result
   */
  getLastHealthCheck(): APMSystemHealth | null {
    return this.lastHealthCheck || null;
  }

  /**
   * Check specific service health
   */
  async checkServiceHealth(serviceName: string): Promise<HealthCheckResult> {
    switch (serviceName) {
      case 'apm':
        return this.checkAPMService();
      case 'alerting':
        return this.checkAlertingService();
      case 'observability':
        return this.checkObservabilityService();
      case 'dashboard':
        return this.checkDashboardService();
      case 'provider':
        return this.checkProviderConnectivity();
      case 'metrics':
        return this.checkMetricsCollection();
      case 'traces':
        return this.checkTraceCollection();
      default:
        return {
          service: serviceName,
          status: 'unknown',
          message: 'Unknown service',
          timestamp: new Date(),
        };
    }
  }

  // Individual Service Health Checks
  private async checkAPMService(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const isEnabled = apmService.isEnabled();
      const provider = apmService.getProvider();

      if (!isEnabled) {
        return {
          service: 'apm',
          status: 'warning',
          message: 'APM service is disabled',
          details: { enabled: false, provider },
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
        };
      }

      // Test basic APM functionality
      const testTransaction = apmService.startTransaction('health_check', 'test');
      if (testTransaction) {
        apmService.endTransaction(testTransaction);
      }

      return {
        service: 'apm',
        status: 'healthy',
        message: 'APM service is functioning normally',
        details: { enabled: true, provider },
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service: 'apm',
        status: 'critical',
        message: 'APM service check failed',
        details: { error: (error as Error).message },
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkAlertingService(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const isEnabled = apmAlerting.isEnabled();
      const rules = apmAlerting.getRules();
      const activeAlerts = apmAlerting.getActiveAlerts();

      return {
        service: 'alerting',
        status: isEnabled ? 'healthy' : 'warning',
        message: isEnabled
          ? 'Alerting service is functioning normally'
          : 'Alerting service is disabled',
        details: {
          enabled: isEnabled,
          rulesCount: rules.length,
          activeAlertsCount: activeAlerts.length,
        },
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service: 'alerting',
        status: 'critical',
        message: 'Alerting service check failed',
        details: { error: (error as Error).message },
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkObservabilityService(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const config = unifiedObservability.getConfig();
      const activeSessions = unifiedObservability.getActiveSessions();

      return {
        service: 'observability',
        status: config.enabled ? 'healthy' : 'warning',
        message: config.enabled
          ? 'Observability service is functioning normally'
          : 'RUM is disabled',
        details: {
          enabled: config.enabled,
          activeSessionsCount: activeSessions.length,
          sampleRate: config.sampleRate,
        },
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service: 'observability',
        status: 'critical',
        message: 'Observability service check failed',
        details: { error: (error as Error).message },
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkDashboardService(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const dashboards = apmDashboard.getDashboards();

      // Test dashboard data retrieval
      if (dashboards.length > 0) {
        await apmDashboard.getDashboardData(dashboards[0].id);
      }

      return {
        service: 'dashboard',
        status: 'healthy',
        message: 'Dashboard service is functioning normally',
        details: { dashboardsCount: dashboards.length },
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service: 'dashboard',
        status: 'critical',
        message: 'Dashboard service check failed',
        details: { error: (error as Error).message },
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkProviderConnectivity(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const provider = apmService.getProvider();
      const isEnabled = apmService.isEnabled();

      if (!isEnabled || provider === 'none') {
        return {
          service: 'provider',
          status: 'warning',
          message: 'No APM provider configured',
          details: { provider, enabled: isEnabled },
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
        };
      }

      // Test provider connectivity by attempting to record a metric
      apmService.recordBusinessMetric('health_check.connectivity', 1, 'count');

      return {
        service: 'provider',
        status: 'healthy',
        message: `${provider} provider connectivity is healthy`,
        details: { provider, enabled: isEnabled },
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service: 'provider',
        status: 'critical',
        message: 'Provider connectivity check failed',
        details: { error: (error as Error).message },
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkMetricsCollection(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Record test metrics
      const testValue = Math.random() * 100;
      apmService.recordBusinessMetric('health_check.test_metric', testValue, 'count');

      return {
        service: 'metrics',
        status: 'healthy',
        message: 'Metrics collection is functioning normally',
        details: { testMetricValue: testValue },
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service: 'metrics',
        status: 'critical',
        message: 'Metrics collection check failed',
        details: { error: (error as Error).message },
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  private async checkTraceCollection(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Create test trace
      const transaction = apmService.startTransaction('health_check.trace_test', 'health_check');

      if (transaction) {
        const span = apmService.startSpan('test_span', transaction);
        if (span) {
          apmService.endSpan(span);
        }
        apmService.endTransaction(transaction);
      }

      return {
        service: 'traces',
        status: transaction ? 'healthy' : 'warning',
        message: transaction
          ? 'Trace collection is functioning normally'
          : 'Trace collection may have issues',
        details: { transactionCreated: !!transaction },
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service: 'traces',
        status: 'critical',
        message: 'Trace collection check failed',
        details: { error: (error as Error).message },
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
      };
    }
  }

  // Configuration Validation
  validateConfiguration(): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check required environment variables
    if (!process.env.APM_ENABLED) {
      warnings.push('APM_ENABLED environment variable not set');
    }

    if (!process.env.APM_PROVIDER) {
      warnings.push('APM_PROVIDER environment variable not set');
    }

    // Provider-specific validation
    const provider = process.env.APM_PROVIDER;

    if (provider === 'newrelic') {
      if (!process.env.NEW_RELIC_LICENSE_KEY) {
        errors.push('NEW_RELIC_LICENSE_KEY is required for New Relic provider');
      }
      if (!process.env.NEW_RELIC_APP_NAME) {
        warnings.push('NEW_RELIC_APP_NAME not set, using default');
      }
    }

    if (provider === 'datadog') {
      if (!process.env.DD_API_KEY) {
        errors.push('DD_API_KEY is required for Datadog provider');
      }
      if (!process.env.DD_SERVICE) {
        warnings.push('DD_SERVICE not set, using default');
      }
    }

    // Performance recommendations
    if (process.env.APM_ENABLED === 'true') {
      if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
        recommendations.push('Consider reducing APM sampling rate in development');
      }

      if (!process.env.APM_SAMPLE_RATE) {
        recommendations.push('Set APM_SAMPLE_RATE to control data volume and costs');
      }
    }

    // Alerting configuration
    if (process.env.APM_ALERTING_ENABLED === 'true') {
      if (!process.env.SLACK_WEBHOOK_URL && !process.env.ALERT_EMAIL) {
        warnings.push('No alerting channels configured');
      }
    }

    // RUM configuration
    if (process.env.RUM_ENABLED === 'true') {
      if (!process.env.RUM_SAMPLE_RATE) {
        recommendations.push('Set RUM_SAMPLE_RATE to optimize frontend monitoring');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations,
    };
  }

  // Health Determination
  private determineOverallHealth(
    services: HealthCheckResult[],
    configuration: ConfigValidationResult
  ): 'healthy' | 'warning' | 'critical' {
    // Critical if any service is critical or configuration has errors
    if (services.some((s) => s.status === 'critical') || !configuration.valid) {
      return 'critical';
    }

    // Warning if any service has warnings or configuration has warnings
    if (services.some((s) => s.status === 'warning') || configuration.warnings.length > 0) {
      return 'warning';
    }

    return 'healthy';
  }

  // Periodic Health Checks
  private startPeriodicHealthChecks(): void {
    // Perform initial health check
    this.performHealthCheck();

    // Set up periodic checks every 5 minutes
    this.healthCheckInterval = setInterval(
      () => {
        this.performHealthCheck();
      },
      5 * 60 * 1000
    );
  }

  /**
   * Generate health check report
   */
  generateHealthReport(): string {
    const health = this.lastHealthCheck;
    if (!health) {
      return 'No health check data available';
    }

    let report = `APM System Health Report
Generated: ${health.lastCheck.toISOString()}
Overall Status: ${health.overall.toUpperCase()}
System Uptime: ${Math.round(health.uptime / 1000 / 60)} minutes

SERVICES:
`;

    health.services.forEach((service) => {
      report += `  ${service.service}: ${service.status.toUpperCase()} - ${service.message}`;
      if (service.responseTime) {
        report += ` (${service.responseTime}ms)`;
      }
      report += '\n';
    });

    report += `
CONFIGURATION:
  Valid: ${health.configuration.valid ? 'YES' : 'NO'}
  Errors: ${health.configuration.errors.length}
  Warnings: ${health.configuration.warnings.length}
  Recommendations: ${health.configuration.recommendations.length}
`;

    if (health.configuration.errors.length > 0) {
      report += '\nERRORS:\n';
      health.configuration.errors.forEach((error) => {
        report += `  - ${error}\n`;
      });
    }

    if (health.configuration.warnings.length > 0) {
      report += '\nWARNINGS:\n';
      health.configuration.warnings.forEach((warning) => {
        report += `  - ${warning}\n`;
      });
    }

    if (health.configuration.recommendations.length > 0) {
      report += '\nRECOMMENDATIONS:\n';
      health.configuration.recommendations.forEach((rec) => {
        report += `  - ${rec}\n`;
      });
    }

    return report;
  }

  /**
   * Export health data as JSON
   */
  exportHealthData(): APMSystemHealth | null {
    return this.lastHealthCheck || null;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

// Export singleton instance
export const apmHealthCheck = APMHealthCheck.getInstance();
