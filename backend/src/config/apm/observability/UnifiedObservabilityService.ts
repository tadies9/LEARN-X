/**
 * Unified Observability Service
 * Connects frontend RUM with backend APM for comprehensive monitoring
 */

import { 
  UserSession, 
  PageView, 
  APICall, 
  UserError, 
  RUMConfiguration 
} from './types/observability.types';
import { SessionManager } from './SessionManager';
import { EventTracker } from './EventTracker';
import { MetricsCalculator } from './MetricsCalculator';
import { RUMScriptGenerator } from './RUMScriptGenerator';

export class UnifiedObservabilityService {
  private static instance: UnifiedObservabilityService;
  private config: RUMConfiguration;
  private sessionManager: SessionManager;
  private eventTracker: EventTracker;
  private sessionCleanupTimer?: NodeJS.Timeout;

  private constructor() {
    this.config = {
      enabled: process.env.RUM_ENABLED === 'true',
      sampleRate: parseFloat(process.env.RUM_SAMPLE_RATE || '1.0'),
      trackingEndpoint: process.env.RUM_TRACKING_ENDPOINT || '/api/rum',
      sessionTimeout: parseInt(process.env.RUM_SESSION_TIMEOUT || '30'),
      errorReporting: process.env.RUM_ERROR_REPORTING !== 'false',
      performanceTracking: process.env.RUM_PERFORMANCE_TRACKING !== 'false',
      customEvents: process.env.RUM_CUSTOM_EVENTS !== 'false',
    };

    this.sessionManager = new SessionManager(this.config.sessionTimeout);
    this.eventTracker = new EventTracker();
    this.startSessionCleanup();
  }

  static getInstance(): UnifiedObservabilityService {
    if (!UnifiedObservabilityService.instance) {
      UnifiedObservabilityService.instance = new UnifiedObservabilityService();
    }
    return UnifiedObservabilityService.instance;
  }

  /**
   * Initialize user session
   */
  startSession(sessionData: Partial<UserSession>): UserSession {
    const session = this.sessionManager.startSession(sessionData);
    this.eventTracker.recordSessionEvent('session_start', session);
    return session;
  }

  /**
   * End user session
   */
  endSession(sessionId: string): void {
    const session = this.sessionManager.endSession(sessionId);
    if (!session) return;

    this.eventTracker.recordSessionEvent('session_end', session);
    this.eventTracker.recordFinalSessionMetrics(session);
  }

  /**
   * Track page view
   */
  trackPageView(sessionId: string, pageView: Omit<PageView, 'timestamp'>): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) return;

    const fullPageView: PageView = {
      ...pageView,
      timestamp: new Date(),
    };

    session.pageViews.push(fullPageView);
    session.performance.totalPageViews++;

    MetricsCalculator.updatePageViewMetrics(session, fullPageView);
    this.eventTracker.recordPageViewEvent(session, fullPageView);
  }

  /**
   * Correlate frontend RUM data with backend traces
   */
  correlateWithBackendTrace(sessionId: string, apiCall: Omit<APICall, 'timestamp'>): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) return;

    const fullApiCall: APICall = {
      ...apiCall,
      timestamp: new Date(),
    };

    session.apiCalls.push(fullApiCall);
    session.performance.totalApiCalls++;

    MetricsCalculator.updateApiCallMetrics(session, fullApiCall);
    this.eventTracker.correlateTrace(session, fullApiCall);
    this.eventTracker.recordApiCallEvent(session, fullApiCall);
  }

  /**
   * Track user error
   */
  trackError(sessionId: string, error: Omit<UserError, 'errorId' | 'timestamp'>): void {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) return;

    const fullError: UserError = {
      errorId: MetricsCalculator.generateErrorId(),
      ...error,
      timestamp: new Date(),
    };

    session.errors.push(fullError);
    session.performance.errorCount++;

    this.eventTracker.recordErrorEvent(session, fullError);

    // Correlate with backend error if applicable
    if (fullError.source === 'api' && fullError.context?.traceId) {
      this.eventTracker.correlateErrorWithBackend(session, fullError);
    }
  }

  /**
   * Track custom event
   */
  trackCustomEvent(sessionId: string, eventName: string, properties: Record<string, any>): void {
    if (!this.config.customEvents) return;

    const session = this.sessionManager.getSession(sessionId);
    if (!session) return;

    this.eventTracker.recordCustomEvent(session, eventName, properties);
  }

  /**
   * Get session data
   */
  getSession(sessionId: string): UserSession | null {
    return this.sessionManager.getSession(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): UserSession[] {
    return this.sessionManager.getActiveSessions();
  }

  /**
   * Generate RUM script for frontend injection
   */
  generateRUMScript(): string {
    return RUMScriptGenerator.generateScript(this.config);
  }

  /**
   * Get configuration
   */
  getConfig(): RUMConfiguration {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RUMConfiguration>): void {
    this.config = { ...this.config, ...updates };
  }

  private startSessionCleanup(): void {
    this.sessionCleanupTimer = setInterval(
      () => {
        this.sessionManager.cleanupStaleSessions();
      },
      5 * 60 * 1000 // Every 5 minutes
    );
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.sessionCleanupTimer) {
      clearInterval(this.sessionCleanupTimer);
    }
  }
}

// Export singleton instance
export const unifiedObservability = UnifiedObservabilityService.getInstance();