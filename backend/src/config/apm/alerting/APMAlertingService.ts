/**
 * APM Alerting Service
 * Handles performance degradation detection and alert management
 */

import { logger } from '../../../utils/logger';

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

export class APMAlertingService {
  private static instance: APMAlertingService;
  private config: AlertingConfig;
  private rules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private evaluationTimer?: NodeJS.Timeout;
  private metricHistory: Map<string, Array<{ value: number; timestamp: Date }>> = new Map();
  private readonly HISTORY_RETENTION_MINUTES = 60;

  private constructor() {
    this.config = {
      enabled: process.env.APM_ALERTING_ENABLED === 'true',
      evaluationInterval: parseInt(process.env.APM_ALERTING_INTERVAL || '60'),
      retryAttempts: parseInt(process.env.APM_ALERTING_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.APM_ALERTING_RETRY_DELAY || '5'),
      defaultChannels: this.parseDefaultChannels(),
    };
  }

  static getInstance(): APMAlertingService {
    if (!APMAlertingService.instance) {
      APMAlertingService.instance = new APMAlertingService();
    }
    return APMAlertingService.instance;
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('🚨 APM Alerting disabled');
      return;
    }

    try {
      // Load default alert rules
      this.loadDefaultRules();

      // Start evaluation timer
      this.startEvaluationTimer();

      logger.info('🚨 APM Alerting Service initialized');
    } catch (error) {
      logger.error('Failed to initialize APM Alerting Service:', error);
      throw error;
    }
  }

  // Rule Management
  addRule(rule: AlertRule): void {
    this.validateRule(rule);
    this.rules.set(rule.id, rule);
    logger.info(`Alert rule added: ${rule.name}`);
  }

  removeRule(ruleId: string): boolean {
    if (this.rules.delete(ruleId)) {
      logger.info(`Alert rule removed: ${ruleId}`);
      return true;
    }
    return false;
  }

  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const updatedRule = { ...rule, ...updates };
    this.validateRule(updatedRule);
    this.rules.set(ruleId, updatedRule);

    logger.info(`Alert rule updated: ${rule.name}`);
    return true;
  }

  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  // Metric Recording
  recordMetric(metricName: string, value: number): void {
    if (!this.config.enabled) return;

    const now = new Date();
    const history = this.metricHistory.get(metricName) || [];

    // Add new value
    history.push({ value, timestamp: now });

    // Remove old values
    const cutoff = new Date(now.getTime() - this.HISTORY_RETENTION_MINUTES * 60 * 1000);
    const filteredHistory = history.filter((h) => h.timestamp > cutoff);

    this.metricHistory.set(metricName, filteredHistory);
  }

  // Alert Evaluation
  private async evaluateRules(): Promise<void> {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        await this.evaluateRule(rule);
      } catch (error) {
        logger.error(`Error evaluating rule ${rule.name}:`, error);
      }
    }
  }

  private async evaluateRule(rule: AlertRule): Promise<void> {
    const metricHistory = this.metricHistory.get(rule.metric);
    if (!metricHistory || metricHistory.length === 0) return;

    // Calculate metric value based on duration
    const durationMs = rule.duration * 60 * 1000;
    const cutoff = new Date(Date.now() - durationMs);
    const relevantValues = metricHistory.filter((h) => h.timestamp > cutoff).map((h) => h.value);

    if (relevantValues.length === 0) return;

    // Calculate average value
    const currentValue = relevantValues.reduce((sum, val) => sum + val, 0) / relevantValues.length;

    // Check condition
    const shouldTrigger = this.evaluateCondition(rule.condition, currentValue, rule.threshold);
    const alertKey = `${rule.id}_${rule.metric}`;
    const existingAlert = this.activeAlerts.get(alertKey);

    if (shouldTrigger && !existingAlert) {
      // Trigger new alert
      const alert: AlertEvent = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        metric: rule.metric,
        currentValue,
        threshold: rule.threshold,
        severity: rule.severity,
        status: 'triggered',
        triggeredAt: new Date(),
        context: {
          duration: rule.duration,
          condition: rule.condition,
          tags: rule.tags,
        },
      };

      this.activeAlerts.set(alertKey, alert);
      await this.sendAlert(alert, rule.channels);
    } else if (!shouldTrigger && existingAlert) {
      // Resolve existing alert
      existingAlert.status = 'resolved';
      existingAlert.resolvedAt = new Date();

      await this.sendAlertResolution(existingAlert, rule.channels);
      this.activeAlerts.delete(alertKey);
    }
  }

  private evaluateCondition(condition: string, value: number, threshold: number): boolean {
    switch (condition) {
      case 'above':
        return value > threshold;
      case 'below':
        return value < threshold;
      case 'equal':
        return value === threshold;
      default:
        return false;
    }
  }

  // Alert Sending
  private async sendAlert(alert: AlertEvent, channels: AlertChannel[]): Promise<void> {
    const allChannels = [...channels, ...this.config.defaultChannels];

    for (const channel of allChannels) {
      try {
        await this.sendToChannel(alert, channel);
      } catch (error) {
        logger.error(`Failed to send alert to ${channel.type}:`, error);

        // Retry logic
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
          await this.delay(this.config.retryDelay * 1000);

          try {
            await this.sendToChannel(alert, channel);
            break;
          } catch (retryError) {
            logger.error(`Retry ${attempt} failed for ${channel.type}:`, retryError);
          }
        }
      }
    }
  }

  private async sendAlertResolution(alert: AlertEvent, channels: AlertChannel[]): Promise<void> {
    const allChannels = [...channels, ...this.config.defaultChannels];

    for (const channel of allChannels) {
      try {
        await this.sendResolutionToChannel(alert, channel);
      } catch (error) {
        logger.error(`Failed to send resolution to ${channel.type}:`, error);
      }
    }
  }

  private async sendToChannel(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    switch (channel.type) {
      case 'slack':
        await this.sendSlackAlert(alert, channel);
        break;
      case 'email':
        await this.sendEmailAlert(alert, channel);
        break;
      case 'webhook':
        await this.sendWebhookAlert(alert, channel);
        break;
      case 'pagerduty':
        await this.sendPagerDutyAlert(alert, channel);
        break;
      default:
        logger.warn(`Unknown alert channel type: ${channel.type}`);
    }
  }

  private async sendResolutionToChannel(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    switch (channel.type) {
      case 'slack':
        await this.sendSlackResolution(alert, channel);
        break;
      case 'email':
        await this.sendEmailResolution(alert, channel);
        break;
      case 'webhook':
        await this.sendWebhookResolution(alert, channel);
        break;
      case 'pagerduty':
        await this.sendPagerDutyResolution(alert, channel);
        break;
    }
  }

  // Channel Implementations
  private async sendSlackAlert(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    const message = this.formatSlackMessage(alert);

    const response = await fetch(channel.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }
  }

  private async sendSlackResolution(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    const message = this.formatSlackResolution(alert);

    await fetch(channel.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  }

  private async sendEmailAlert(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    // Implementation would depend on your email service
    logger.info(`Email alert sent to ${channel.endpoint} for ${alert.ruleName}`);
  }

  private async sendEmailResolution(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    logger.info(`Email resolution sent to ${channel.endpoint} for ${alert.ruleName}`);
  }

  private async sendWebhookAlert(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    const payload = {
      type: 'alert',
      alert,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(channel.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...channel.config?.headers,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status}`);
    }
  }

  private async sendWebhookResolution(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    const payload = {
      type: 'resolution',
      alert,
      timestamp: new Date().toISOString(),
    };

    await fetch(channel.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...channel.config?.headers,
      },
      body: JSON.stringify(payload),
    });
  }

  private async sendPagerDutyAlert(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    const payload = {
      routing_key: channel.config?.integrationKey,
      event_action: 'trigger',
      dedup_key: `${alert.ruleId}_${alert.metric}`,
      payload: {
        summary: `${alert.ruleName}: ${alert.metric} is ${alert.currentValue}`,
        severity: alert.severity,
        source: 'learn-x-api',
        component: alert.metric,
        custom_details: {
          metric: alert.metric,
          currentValue: alert.currentValue,
          threshold: alert.threshold,
          context: alert.context,
        },
      },
    };

    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`PagerDuty API error: ${response.status}`);
    }
  }

  private async sendPagerDutyResolution(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    const payload = {
      routing_key: channel.config?.integrationKey,
      event_action: 'resolve',
      dedup_key: `${alert.ruleId}_${alert.metric}`,
    };

    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  // Message Formatting
  private formatSlackMessage(alert: AlertEvent): any {
    const emoji = this.getSeverityEmoji(alert.severity);
    const color = this.getSeverityColor(alert.severity);

    return {
      attachments: [
        {
          color,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${emoji} ALERT: ${alert.ruleName}`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Metric:* ${alert.metric}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Current Value:* ${alert.currentValue.toFixed(2)}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Threshold:* ${alert.threshold}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Severity:* ${alert.severity.toUpperCase()}`,
                },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Triggered:* ${alert.triggeredAt.toISOString()}`,
              },
            },
          ],
        },
      ],
    };
  }

  private formatSlackResolution(alert: AlertEvent): any {
    return {
      attachments: [
        {
          color: 'good',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `✅ RESOLVED: ${alert.ruleName}`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `Alert for metric \`${alert.metric}\` has been resolved.`,
              },
            },
          ],
        },
      ],
    };
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚠️';
      case 'low':
        return 'ℹ️';
      default:
        return '🔔';
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'danger';
      case 'high':
        return 'warning';
      case 'medium':
        return 'warning';
      case 'low':
        return 'good';
      default:
        return '#808080';
    }
  }

  // Utility Methods
  private validateRule(rule: AlertRule): void {
    if (!rule.id || !rule.name || !rule.metric) {
      throw new Error('Alert rule must have id, name, and metric');
    }

    if (!['above', 'below', 'equal'].includes(rule.condition)) {
      throw new Error('Invalid condition. Must be: above, below, or equal');
    }

    if (!['low', 'medium', 'high', 'critical'].includes(rule.severity)) {
      throw new Error('Invalid severity. Must be: low, medium, high, or critical');
    }

    if (rule.duration <= 0) {
      throw new Error('Duration must be greater than 0');
    }
  }

  private parseDefaultChannels(): AlertChannel[] {
    const channels: AlertChannel[] = [];

    // Slack webhook
    if (process.env.SLACK_WEBHOOK_URL) {
      channels.push({
        type: 'slack',
        endpoint: process.env.SLACK_WEBHOOK_URL,
      });
    }

    // Email
    if (process.env.ALERT_EMAIL) {
      channels.push({
        type: 'email',
        endpoint: process.env.ALERT_EMAIL,
      });
    }

    // PagerDuty
    if (process.env.PAGERDUTY_INTEGRATION_KEY) {
      channels.push({
        type: 'pagerduty',
        endpoint: 'https://events.pagerduty.com/v2/enqueue',
        config: {
          integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
        },
      });
    }

    return channels;
  }

  private loadDefaultRules(): void {
    // Default performance rules
    this.addRule({
      id: 'response_time_high',
      name: 'High Response Time',
      description: 'API response time is above acceptable threshold',
      metric: 'http.request.duration',
      condition: 'above',
      threshold: 500, // ms
      duration: 5, // minutes
      severity: 'high',
      enabled: true,
      channels: [],
    });

    this.addRule({
      id: 'error_rate_high',
      name: 'High Error Rate',
      description: 'Error rate is above acceptable threshold',
      metric: 'errors.rate',
      condition: 'above',
      threshold: 5, // percent
      duration: 10,
      severity: 'critical',
      enabled: true,
      channels: [],
    });

    this.addRule({
      id: 'ai_cost_spike',
      name: 'AI Cost Spike',
      description: 'AI usage costs are spiking',
      metric: 'ai.cost.hourly',
      condition: 'above',
      threshold: 10, // USD
      duration: 5,
      severity: 'medium',
      enabled: true,
      channels: [],
    });

    this.addRule({
      id: 'queue_depth_high',
      name: 'High Queue Depth',
      description: 'Queue depth is too high',
      metric: 'queue.depth',
      condition: 'above',
      threshold: 100,
      duration: 15,
      severity: 'high',
      enabled: true,
      channels: [],
    });

    logger.info('Default alert rules loaded');
  }

  private startEvaluationTimer(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }

    this.evaluationTimer = setInterval(
      () => this.evaluateRules(),
      this.config.evaluationInterval * 1000
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public Getters
  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  getMetricHistory(metricName: string): Array<{ value: number; timestamp: Date }> {
    return this.metricHistory.get(metricName) || [];
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // Cleanup
  destroy(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }
  }
}

// Export singleton instance
export const apmAlerting = APMAlertingService.getInstance();
