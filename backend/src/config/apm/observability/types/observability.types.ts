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