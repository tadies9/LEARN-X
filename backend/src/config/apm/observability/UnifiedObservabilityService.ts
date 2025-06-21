/**
 * Unified Observability Service
 * Connects frontend RUM with backend APM for comprehensive monitoring
 */

import { apmService } from '../APMService';
import { businessMetrics } from '../metrics/BusinessMetrics';

export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  userAgent: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  pageViews: PageView[];
  apiCalls: APICall[];
  errors: UserError[];
  performance: SessionPerformance;
}

export interface PageView {
  pageId: string;
  url: string;
  title: string;
  loadTime: number;
  timeOnPage: number;
  exitPage: boolean;
  referrer?: string;
  timestamp: Date;
  vitals?: WebVitals;
}

export interface WebVitals {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

export interface APICall {
  traceId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface UserError {
  errorId: string;
  message: string;
  stack?: string;
  source: 'frontend' | 'backend' | 'api';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  timestamp: Date;
  resolved?: boolean;
}

export interface SessionPerformance {
  totalPageViews: number;
  totalApiCalls: number;
  avgPageLoadTime: number;
  avgApiResponseTime: number;
  errorCount: number;
  bounceRate: number;
  engagementScore: number;
}

export interface RUMConfiguration {
  enabled: boolean;
  sampleRate: number;
  trackingEndpoint: string;
  sessionTimeout: number; // minutes
  errorReporting: boolean;
  performanceTracking: boolean;
  customEvents: boolean;
}

export class UnifiedObservabilityService {
  private static instance: UnifiedObservabilityService;
  private config: RUMConfiguration;
  private activeSessions: Map<string, UserSession> = new Map();
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
    const session: UserSession = {
      sessionId: sessionData.sessionId || this.generateSessionId(),
      userId: sessionData.userId,
      startTime: new Date(),
      userAgent: sessionData.userAgent || 'unknown',
      deviceType: this.detectDeviceType(sessionData.userAgent || ''),
      location: sessionData.location,
      pageViews: [],
      apiCalls: [],
      errors: [],
      performance: {
        totalPageViews: 0,
        totalApiCalls: 0,
        avgPageLoadTime: 0,
        avgApiResponseTime: 0,
        errorCount: 0,
        bounceRate: 0,
        engagementScore: 0,
      },
    };

    this.activeSessions.set(session.sessionId, session);

    // Record session start
    this.recordSessionEvent('session_start', session);

    return session;
  }

  /**
   * End user session
   */
  endSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.endTime = new Date();

    // Calculate final performance metrics
    this.calculateSessionMetrics(session);

    // Record session end
    this.recordSessionEvent('session_end', session);

    // Clean up
    this.activeSessions.delete(sessionId);
  }

  /**
   * Track page view
   */
  trackPageView(sessionId: string, pageView: Omit<PageView, 'timestamp'>): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const fullPageView: PageView = {
      ...pageView,
      timestamp: new Date(),
    };

    session.pageViews.push(fullPageView);
    session.performance.totalPageViews++;

    // Update performance metrics
    this.updatePageViewMetrics(session, fullPageView);

    // Record page view
    this.recordPageViewEvent(session, fullPageView);
  }

  /**
   * Correlate frontend RUM data with backend traces
   */
  correlateWithBackendTrace(sessionId: string, apiCall: Omit<APICall, 'timestamp'>): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const fullApiCall: APICall = {
      ...apiCall,
      timestamp: new Date(),
    };

    session.apiCalls.push(fullApiCall);
    session.performance.totalApiCalls++;

    // Update API performance metrics
    this.updateApiCallMetrics(session, fullApiCall);

    // Correlate with backend trace
    this.correlateTrace(session, fullApiCall);

    // Record API call
    this.recordApiCallEvent(session, fullApiCall);
  }

  /**
   * Track user error
   */
  trackError(sessionId: string, error: Omit<UserError, 'errorId' | 'timestamp'>): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const fullError: UserError = {
      errorId: this.generateErrorId(),
      ...error,
      timestamp: new Date(),
    };

    session.errors.push(fullError);
    session.performance.errorCount++;

    // Record error
    this.recordErrorEvent(session, fullError);

    // Correlate with backend error if applicable
    if (fullError.source === 'api' && fullError.context?.traceId) {
      this.correlateErrorWithBackend(session, fullError);
    }
  }

  /**
   * Track custom event
   */
  trackCustomEvent(sessionId: string, eventName: string, properties: Record<string, any>): void {
    if (!this.config.customEvents) return;

    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Record custom event
    apmService.recordEvent('rum.custom_event', {
      sessionId,
      userId: session.userId,
      eventName,
      deviceType: session.deviceType,
      timestamp: Date.now(),
      ...properties,
    });

    businessMetrics.recordUserActivity(session.userId || 'anonymous', eventName, {
      sessionId,
      deviceType: session.deviceType,
      ...properties,
    });
  }

  /**
   * Get session data
   */
  getSession(sessionId: string): UserSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): UserSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Generate RUM script for frontend injection
   */
  generateRUMScript(): string {
    return `
(function() {
  if (!window.LearnXRUM) {
    window.LearnXRUM = {
      config: ${JSON.stringify({
        enabled: this.config.enabled,
        sampleRate: this.config.sampleRate,
        trackingEndpoint: this.config.trackingEndpoint,
        errorReporting: this.config.errorReporting,
        performanceTracking: this.config.performanceTracking,
      })},
      
      sessionId: null,
      userId: null,
      
      init: function(options) {
        if (!this.config.enabled) return;
        
        this.sessionId = this.generateSessionId();
        this.userId = options.userId;
        
        this.startSession();
        this.setupErrorTracking();
        this.setupPerformanceTracking();
        this.setupPageTracking();
      },
      
      startSession: function() {
        this.sendEvent('session_start', {
          sessionId: this.sessionId,
          userId: this.userId,
          userAgent: navigator.userAgent,
          url: window.location.href,
          referrer: document.referrer,
          timestamp: Date.now()
        });
      },
      
      trackPageView: function(pageData) {
        if (!this.config.enabled) return;
        
        this.sendEvent('page_view', {
          sessionId: this.sessionId,
          userId: this.userId,
          ...pageData,
          timestamp: Date.now()
        });
      },
      
      trackApiCall: function(callData) {
        if (!this.config.enabled) return;
        
        this.sendEvent('api_call', {
          sessionId: this.sessionId,
          userId: this.userId,
          ...callData,
          timestamp: Date.now()
        });
      },
      
      trackError: function(error) {
        if (!this.config.enabled || !this.config.errorReporting) return;
        
        this.sendEvent('error', {
          sessionId: this.sessionId,
          userId: this.userId,
          message: error.message,
          stack: error.stack,
          source: 'frontend',
          severity: 'medium',
          context: {
            url: window.location.href,
            userAgent: navigator.userAgent
          },
          timestamp: Date.now()
        });
      },
      
      trackCustomEvent: function(eventName, properties) {
        if (!this.config.enabled) return;
        
        this.sendEvent('custom_event', {
          sessionId: this.sessionId,
          userId: this.userId,
          eventName: eventName,
          properties: properties,
          timestamp: Date.now()
        });
      },
      
      setupErrorTracking: function() {
        if (!this.config.errorReporting) return;
        
        window.addEventListener('error', (event) => {
          this.trackError(event.error);
        });
        
        window.addEventListener('unhandledrejection', (event) => {
          this.trackError(new Error(event.reason));
        });
      },
      
      setupPerformanceTracking: function() {
        if (!this.config.performanceTracking) return;
        
        window.addEventListener('load', () => {
          setTimeout(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const paint = performance.getEntriesByType('paint');
            
            this.sendEvent('performance', {
              sessionId: this.sessionId,
              userId: this.userId,
              vitals: {
                ttfb: navigation.responseStart - navigation.requestStart,
                fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
                loadTime: navigation.loadEventEnd - navigation.loadEventStart
              },
              timestamp: Date.now()
            });
          }, 1000);
        });
      },
      
      setupPageTracking: function() {
        // Track initial page load
        this.trackPageView({
          pageId: this.generatePageId(),
          url: window.location.href,
          title: document.title,
          loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart
        });
        
        // Track SPA navigation
        let lastUrl = window.location.href;
        new MutationObserver(() => {
          if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            this.trackPageView({
              pageId: this.generatePageId(),
              url: window.location.href,
              title: document.title,
              loadTime: 0 // SPA navigation
            });
          }
        }).observe(document, { subtree: true, childList: true });
      },
      
      sendEvent: function(eventType, data) {
        if (Math.random() > this.config.sampleRate) return;
        
        fetch(this.config.trackingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: eventType,
            data: data
          })
        }).catch(error => {
          console.warn('RUM tracking failed:', error);
        });
      },
      
      generateSessionId: function() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      },
      
      generatePageId: function() {
        return 'page_' + Math.random().toString(36).substr(2, 9);
      }
    };
  }
})();`;
  }

  // Private Methods
  private recordSessionEvent(eventType: string, session: UserSession): void {
    apmService.recordEvent(`rum.${eventType}`, {
      sessionId: session.sessionId,
      userId: session.userId,
      userAgent: session.userAgent,
      deviceType: session.deviceType,
      location: session.location,
      timestamp: Date.now(),
    });

    businessMetrics.recordUserActivity(session.userId || 'anonymous', eventType, {
      sessionId: session.sessionId,
      deviceType: session.deviceType,
    });
  }

  private recordPageViewEvent(session: UserSession, pageView: PageView): void {
    apmService.recordEvent('rum.page_view', {
      sessionId: session.sessionId,
      userId: session.userId,
      url: pageView.url,
      title: pageView.title,
      loadTime: pageView.loadTime,
      vitals: pageView.vitals,
      timestamp: pageView.timestamp.getTime(),
    });

    businessMetrics.recordUserActivity(session.userId || 'anonymous', 'page_view', {
      sessionId: session.sessionId,
      url: pageView.url,
      loadTime: pageView.loadTime,
    });
  }

  private recordApiCallEvent(session: UserSession, apiCall: APICall): void {
    apmService.recordEvent('rum.api_call', {
      sessionId: session.sessionId,
      userId: session.userId,
      traceId: apiCall.traceId,
      endpoint: apiCall.endpoint,
      method: apiCall.method,
      statusCode: apiCall.statusCode,
      duration: apiCall.duration,
      success: apiCall.success,
      timestamp: apiCall.timestamp.getTime(),
    });
  }

  private recordErrorEvent(session: UserSession, error: UserError): void {
    apmService.recordEvent('rum.error', {
      sessionId: session.sessionId,
      userId: session.userId,
      errorId: error.errorId,
      message: error.message,
      source: error.source,
      severity: error.severity,
      context: error.context,
      timestamp: error.timestamp.getTime(),
    });

    // Also capture as APM error
    apmService.captureError(new Error(error.message), {
      sessionId: session.sessionId,
      userId: session.userId,
      source: error.source,
      severity: error.severity,
      ...error.context,
    });
  }

  private correlateTrace(session: UserSession, apiCall: APICall): void {
    // Set user context on the trace
    if (apiCall.traceId) {
      apmService.setUser(session.userId || 'anonymous', {
        sessionId: session.sessionId,
        deviceType: session.deviceType,
        userAgent: session.userAgent,
      });
    }
  }

  private correlateErrorWithBackend(session: UserSession, error: UserError): void {
    // Additional context for backend correlation
    apmService.captureError(new Error(`Frontend Error: ${error.message}`), {
      sessionId: session.sessionId,
      userId: session.userId,
      traceId: error.context?.traceId,
      correlationType: 'rum_backend',
      frontendErrorId: error.errorId,
    });
  }

  private updatePageViewMetrics(session: UserSession, pageView: PageView): void {
    const totalViews = session.performance.totalPageViews;
    const currentAvg = session.performance.avgPageLoadTime;

    session.performance.avgPageLoadTime =
      (currentAvg * (totalViews - 1) + pageView.loadTime) / totalViews;
  }

  private updateApiCallMetrics(session: UserSession, apiCall: APICall): void {
    const totalCalls = session.performance.totalApiCalls;
    const currentAvg = session.performance.avgApiResponseTime;

    session.performance.avgApiResponseTime =
      (currentAvg * (totalCalls - 1) + apiCall.duration) / totalCalls;
  }

  private calculateSessionMetrics(session: UserSession): void {
    // Calculate bounce rate
    session.performance.bounceRate = session.pageViews.length === 1 ? 1 : 0;

    // Calculate engagement score
    const sessionDuration = session.endTime
      ? (session.endTime.getTime() - session.startTime.getTime()) / 1000
      : 0;

    session.performance.engagementScore = Math.min(
      session.performance.totalPageViews * 10 +
        sessionDuration / 60 +
        session.performance.totalApiCalls * 5 -
        session.performance.errorCount * 20,
      100
    );

    // Record final session metrics
    businessMetrics.recordLearningSession(
      session.userId || 'anonymous',
      'session',
      session.sessionId,
      sessionDuration,
      session.deviceType,
      session.performance.errorCount === 0
    );
  }

  private detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    if (/mobile|android|iphone/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startSessionCleanup(): void {
    this.sessionCleanupTimer = setInterval(
      () => {
        const timeout = this.config.sessionTimeout * 60 * 1000;
        const cutoff = Date.now() - timeout;

        for (const [sessionId, session] of this.activeSessions.entries()) {
          if (session.startTime.getTime() < cutoff) {
            this.endSession(sessionId);
          }
        }
      },
      5 * 60 * 1000
    ); // Every 5 minutes
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.sessionCleanupTimer) {
      clearInterval(this.sessionCleanupTimer);
    }
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
}

// Export singleton instance
export const unifiedObservability = UnifiedObservabilityService.getInstance();
