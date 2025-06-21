/**
 * APM Module Index
 * Comprehensive Application Performance Monitoring for LEARN-X
 */

// Core APM Services
export { apmService, APMService } from './APMService';
export { businessMetrics, BusinessMetricsCollector } from './metrics/BusinessMetrics';
export { distributedTracing, DistributedTracingService } from './tracing/DistributedTracing';

// Alerting
export { apmAlerting, APMAlertingService } from './alerting/APMAlertingService';
export type {
  AlertRule,
  AlertChannel,
  AlertEvent,
  AlertingConfig,
} from './alerting/APMAlertingService';

// Middleware
export { queueAPM, QueueAPMMiddleware } from './middleware/QueueAPMMiddleware';
export {
  apmMiddleware,
  databaseAPMMiddleware,
  externalServiceAPMMiddleware,
  trackExecution,
} from '../../middleware/apm';
export {
  distributedTracingMiddleware,
  createTracedHttpClient,
  createTracedAxios,
  traceQueueJob,
  propagateToPython,
  propagateToQueue,
} from '../../middleware/distributedTracing';

// Python Service Integration
export {
  PythonServiceIntegration,
  PythonServiceClient,
  pythonServices,
  createPythonServiceIntegration,
  tracePythonCall,
} from './integrations/PythonServiceIntegration';
export type {
  PythonServiceConfig,
  PythonServiceCall,
  PythonServiceResponse,
} from './integrations/PythonServiceIntegration';

// Unified Observability
export {
  unifiedObservability,
  UnifiedObservabilityService,
} from './observability/UnifiedObservabilityService';
export type {
  UserSession,
  PageView,
  WebVitals,
  APICall,
  UserError,
  SessionPerformance,
  RUMConfiguration,
} from './observability/UnifiedObservabilityService';

// Dashboard
export { apmDashboard, APMDashboardService } from './dashboard/APMDashboardService';
export type {
  Dashboard,
  DashboardWidget,
  WidgetConfig,
  DashboardData,
  WidgetData,
  MetricSeries,
  MetricDataPoint,
} from './dashboard/APMDashboardService';

// Health Check & Validation
export { apmHealthCheck, APMHealthCheck } from './validation/APMHealthCheck';
export type {
  HealthCheckResult,
  ConfigValidationResult,
  APMSystemHealth,
} from './validation/APMHealthCheck';

// Types
export type {
  APMProvider,
  APMConfig,
  APMTransaction,
  APMSpan,
  APMError,
  APMMetric,
  DistributedTracingContext,
  PerformanceBudget,
  BusinessMetricDefinition,
} from './types';

// Providers
export { NewRelicProvider } from './providers/NewRelicProvider';
export { DatadogProvider } from './providers/DatadogProvider';
export { BaseAPMProvider } from './providers/BaseAPMProvider';

/**
 * Initialize all APM services
 */
export async function initializeAPM(): Promise<void> {
  try {
    // Import services to ensure they're loaded
    const { apmService } = await import('./APMService');
    const { apmAlerting } = await import('./alerting/APMAlertingService');
    const { apmHealthCheck } = await import('./validation/APMHealthCheck');

    // Initialize core APM service
    await apmService.initialize();

    // Initialize alerting
    await apmAlerting.initialize();

    // Initialize health checking
    apmHealthCheck.initialize();

    console.log('✅ APM System fully initialized');
  } catch (error) {
    console.error('❌ APM initialization failed:', error);
    throw error;
  }
}

/**
 * Get comprehensive APM system status
 */
export async function getAPMStatus() {
  // Import services to ensure they're loaded
  const { apmService } = await import('./APMService');
  const { apmAlerting } = await import('./alerting/APMAlertingService');
  const { apmHealthCheck } = await import('./validation/APMHealthCheck');
  const { unifiedObservability } = await import('./observability/UnifiedObservabilityService');
  const { apmDashboard } = await import('./dashboard/APMDashboardService');

  const health = await apmHealthCheck.performHealthCheck();
  const activeSessions = unifiedObservability.getActiveSessions();
  const activeAlerts = apmAlerting.getActiveAlerts();
  const dashboards = apmDashboard.getDashboards();

  return {
    health,
    stats: {
      provider: apmService.getProvider(),
      enabled: apmService.isEnabled(),
      activeSessions: activeSessions.length,
      activeAlerts: activeAlerts.length,
      dashboards: dashboards.length,
      alertingEnabled: apmAlerting.isEnabled(),
      rumEnabled: unifiedObservability.getConfig().enabled,
    },
    uptime: health.uptime,
  };
}

/**
 * Shutdown APM services gracefully
 */
export async function shutdownAPM(): Promise<void> {
  try {
    // Import services to ensure they're loaded
    const { apmHealthCheck } = await import('./validation/APMHealthCheck');
    const { unifiedObservability } = await import('./observability/UnifiedObservabilityService');
    const { apmAlerting } = await import('./alerting/APMAlertingService');
    const { queueAPM } = await import('./middleware/QueueAPMMiddleware');

    apmHealthCheck.destroy();
    unifiedObservability.destroy();
    apmAlerting.destroy();
    queueAPM.destroy();

    console.log('✅ APM System shutdown complete');
  } catch (error) {
    console.error('❌ APM shutdown failed:', error);
  }
}
