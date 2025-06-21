export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'above' | 'below' | 'equal';
  threshold: number;
  duration: number; // minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  tags?: Record<string, string>;
  channels: AlertChannel[];
}

export interface AlertChannel {
  type: 'slack' | 'email' | 'webhook' | 'pagerduty';
  endpoint: string;
  config?: Record<string, any>;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'triggered' | 'resolved';
  triggeredAt: Date;
  resolvedAt?: Date;
  context?: Record<string, any>;
}

export interface AlertingConfig {
  enabled: boolean;
  evaluationInterval: number; // seconds
  retryAttempts: number;
  retryDelay: number; // seconds
  defaultChannels: AlertChannel[];
}