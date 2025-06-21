import { UserSession } from './types/observability.types';

export class SessionManager {
  private activeSessions: Map<string, UserSession> = new Map();
  private sessionTimeout: number; // minutes

  constructor(sessionTimeout: number) {
    this.sessionTimeout = sessionTimeout;
  }

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
    return session;
  }

  endSession(sessionId: string): UserSession | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    session.endTime = new Date();
    this.calculateSessionMetrics(session);
    this.activeSessions.delete(sessionId);

    return session;
  }

  getSession(sessionId: string): UserSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  getActiveSessions(): UserSession[] {
    return Array.from(this.activeSessions.values());
  }

  cleanupStaleSessions(): void {
    const timeout = this.sessionTimeout * 60 * 1000;
    const cutoff = Date.now() - timeout;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.startTime.getTime() < cutoff) {
        this.endSession(sessionId);
      }
    }
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
  }

  private detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    if (/mobile|android|iphone/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}