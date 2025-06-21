import { UserSession, PageView, APICall } from './types/observability.types';

export class MetricsCalculator {
  static updatePageViewMetrics(session: UserSession, pageView: PageView): void {
    const totalViews = session.performance.totalPageViews;
    const currentAvg = session.performance.avgPageLoadTime;

    session.performance.avgPageLoadTime =
      (currentAvg * (totalViews - 1) + pageView.loadTime) / totalViews;
  }

  static updateApiCallMetrics(session: UserSession, apiCall: APICall): void {
    const totalCalls = session.performance.totalApiCalls;
    const currentAvg = session.performance.avgApiResponseTime;

    session.performance.avgApiResponseTime =
      (currentAvg * (totalCalls - 1) + apiCall.duration) / totalCalls;
  }

  static generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}