/**
 * Monitoring and APM type definitions
 * Comprehensive interfaces for performance monitoring and observability
 */

// Base monitoring types
export interface MetricValue {
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
  unit?: string;
}

export interface PerformanceMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
  description?: string;
}

// APM Transaction types
export interface APMTransaction {
  id: string;
  name: string;
  type: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  result?: 'success' | 'error' | 'timeout';
  context?: TransactionContext;
  spans?: APMSpan[];
  metadata?: Record<string, unknown>;
}

export interface TransactionContext {
  service: {
    name: string;
    version: string;
    environment: string;
  };
  user?: {
    id: string;
    email?: string;
  };
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  response?: {
    statusCode: number;
    headers?: Record<string, string>;
  };
  custom?: Record<string, unknown>;
}

export interface APMSpan {
  id: string;
  transactionId: string;
  parentId?: string;
  name: string;
  type: string;
  subtype?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  context?: SpanContext;
  stackTrace?: StackFrame[];
  metadata?: Record<string, unknown>;
}

export interface SpanContext {
  db?: {
    type: string;
    instance?: string;
    statement?: string;
    user?: string;
  };
  http?: {
    method: string;
    url: string;
    statusCode?: number;
  };
  message?: {
    queue: string;
    routingKey?: string;
  };
  custom?: Record<string, unknown>;
}

export interface StackFrame {
  filename: string;
  function: string;
  lineno: number;
  colno?: number;
  absPath?: string;
  context?: string[];
  preContext?: string[];
  postContext?: string[];
}

// Error tracking types
export interface APMError {
  id: string;
  message: string;
  type: string;
  handled: boolean;
  timestamp: Date;
  transactionId?: string;
  spanId?: string;
  stackTrace?: StackFrame[];
  context?: ErrorContext;
  fingerprint?: string;
  groupingKey?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorContext {
  user?: {
    id: string;
    email?: string;
  };
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  environment?: Record<string, string>;
  custom?: Record<string, unknown>;
}

// Service health types
export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  version: string;
  uptime: number;
  timestamp: Date;
  checks: HealthCheck[];
  dependencies?: ServiceDependency[];
  metadata?: Record<string, unknown>;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  responseTime?: number;
  message?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export interface ServiceDependency {
  name: string;
  type: 'database' | 'cache' | 'api' | 'queue' | 'storage';
  url?: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  version?: string;
  metadata?: Record<string, unknown>;
}

// Alerting types
export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evaluationInterval: number;
  actions: AlertAction[];
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface AlertCondition {
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  timeWindow: number;
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
  groupBy?: string[];
}

export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty';
  config: EmailConfig | SlackConfig | WebhookConfig | PagerDutyConfig;
  enabled: boolean;
}

export interface EmailConfig {
  to: string[];
  subject?: string;
  template?: string;
}

export interface SlackConfig {
  channel: string;
  webhook: string;
  username?: string;
  iconEmoji?: string;
}

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  payload?: Record<string, unknown>;
}

export interface PagerDutyConfig {
  integrationKey: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  status: 'triggered' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolvedAt?: Date;
  duration?: number;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

// Resource usage types
export interface ResourceUsage {
  cpu: CPUUsage;
  memory: MemoryUsage;
  disk?: DiskUsage;
  network?: NetworkUsage;
  timestamp: Date;
}

export interface CPUUsage {
  percent: number;
  cores: number;
  loadAverage?: number[];
  processes?: number;
}

export interface MemoryUsage {
  used: number;
  total: number;
  percent: number;
  available: number;
  buffers?: number;
  cached?: number;
}

export interface DiskUsage {
  used: number;
  total: number;
  percent: number;
  available: number;
  inodes?: {
    used: number;
    total: number;
    percent: number;
  };
}

export interface NetworkUsage {
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  errors: number;
  drops: number;
}

// Provider-specific types
export interface DatadogMetric {
  metric: string;
  points: Array<[number, number]>;
  tags?: string[];
  host?: string;
  type?: 'gauge' | 'rate' | 'count';
}

export interface NewRelicMetric {
  name: string;
  type: 'gauge' | 'count' | 'summary';
  value: number;
  timestamp?: number;
  attributes?: Record<string, string | number | boolean>;
}

export interface SentryEvent {
  eventId: string;
  message?: string;
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  timestamp?: number;
  platform?: string;
  environment?: string;
  release?: string;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
  exception?: SentryException[];
}

export interface SentryException {
  type: string;
  value: string;
  module?: string;
  stacktrace?: {
    frames: SentryStackFrame[];
  };
}

export interface SentryStackFrame {
  filename: string;
  function: string;
  lineno: number;
  colno?: number;
  absPath?: string;
  contextLine?: string;
  preContext?: string[];
  postContext?: string[];
  inApp?: boolean;
}
