import { apmService } from '../APMService';
import { businessMetrics } from '../metrics/BusinessMetrics';
import { 
  UserSession, 
  PageView, 
  APICall, 
  UserError 
} from './types/observability.types';

export class EventTracker {
  recordSessionEvent(eventType: string, session: UserSession): void {
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

  recordPageViewEvent(session: UserSession, pageView: PageView): void {
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

  recordApiCallEvent(session: UserSession, apiCall: APICall): void {
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

  recordErrorEvent(session: UserSession, error: UserError): void {
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

  recordCustomEvent(session: UserSession, eventName: string, properties: Record<string, any>): void {
    apmService.recordEvent('rum.custom_event', {
      sessionId: session.sessionId,
      userId: session.userId,
      eventName,
      deviceType: session.deviceType,
      timestamp: Date.now(),
      ...properties,
    });

    businessMetrics.recordUserActivity(session.userId || 'anonymous', eventName, {
      sessionId: session.sessionId,
      deviceType: session.deviceType,
      ...properties,
    });
  }

  correlateTrace(session: UserSession, apiCall: APICall): void {
    // Set user context on the trace
    if (apiCall.traceId) {
      apmService.setUser(session.userId || 'anonymous', {
        sessionId: session.sessionId,
        deviceType: session.deviceType,
        userAgent: session.userAgent,
      });
    }
  }

  correlateErrorWithBackend(session: UserSession, error: UserError): void {
    // Additional context for backend correlation
    apmService.captureError(new Error(`Frontend Error: ${error.message}`), {
      sessionId: session.sessionId,
      userId: session.userId,
      traceId: error.context?.traceId,
      correlationType: 'rum_backend',
      frontendErrorId: error.errorId,
    });
  }

  recordFinalSessionMetrics(session: UserSession): void {
    const sessionDuration = session.endTime
      ? (session.endTime.getTime() - session.startTime.getTime()) / 1000
      : 0;

    businessMetrics.recordLearningSession(
      session.userId || 'anonymous',
      'session',
      session.sessionId,
      sessionDuration,
      session.deviceType,
      session.performance.errorCount === 0
    );
  }
}