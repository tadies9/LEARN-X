/**
 * APM Alerting Service
 * Handles performance degradation detection and alert management
 */

import { logger } from '../../../utils/logger';
import { AlertingConfig, AlertRule, AlertEvent, AlertChannel } from './types/alerting.types';
import { AlertRuleManager } from './AlertRuleManager';
import { AlertEvaluator } from './AlertEvaluator';
import { AlertNotifier } from './AlertNotifier';
import { DefaultAlertRules } from './DefaultAlertRules';

export class APMAlertingService {
  private static instance: APMAlertingService;
  private config: AlertingConfig;
  private ruleManager: AlertRuleManager;
  private evaluator: AlertEvaluator;
  private notifier: AlertNotifier;
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private evaluationTimer?: NodeJS.Timeout;

  private constructor() {
    this.config = {
      enabled: process.env.APM_ALERTING_ENABLED === 'true',
      evaluationInterval: parseInt(process.env.APM_ALERTING_INTERVAL || '60'),
      retryAttempts: parseInt(process.env.APM_ALERTING_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.APM_ALERTING_RETRY_DELAY || '5'),
      defaultChannels: this.parseDefaultChannels(),
    };

    this.ruleManager = new AlertRuleManager();
    this.evaluator = new AlertEvaluator();
    this.notifier = new AlertNotifier(this.config);
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
    this.ruleManager.addRule(rule);
  }

  removeRule(ruleId: string): boolean {
    return this.ruleManager.removeRule(ruleId);
  }

  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    return this.ruleManager.updateRule(ruleId, updates);
  }

  getRules(): AlertRule[] {
    return this.ruleManager.getRules();
  }

  getRule(ruleId: string): AlertRule | undefined {
    return this.ruleManager.getRule(ruleId);
  }

  // Metric Recording
  recordMetric(metricName: string, value: number): void {
    if (!this.config.enabled) return;
    this.evaluator.recordMetric(metricName, value);
  }

  // Alert Evaluation
  private async evaluateRules(): Promise<void> {
    const rules = this.ruleManager.getEnabledRules();
    
    for (const rule of rules) {
      try {
        await this.evaluateRule(rule);
      } catch (error) {
        logger.error(`Error evaluating rule ${rule.name}:`, error);
      }
    }
  }

  private async evaluateRule(rule: AlertRule): Promise<void> {
    const evaluation = this.evaluator.evaluateRule(rule);
    if (!evaluation) return;

    const alertKey = `${rule.id}_${rule.metric}`;
    const existingAlert = this.activeAlerts.get(alertKey);

    if (evaluation.shouldTrigger && !existingAlert) {
      // Trigger new alert
      const alert = this.evaluator.createAlertEvent(rule, evaluation.currentValue);
      this.activeAlerts.set(alertKey, alert);
      await this.notifier.sendAlert(alert, rule.channels);
    } else if (!evaluation.shouldTrigger && existingAlert) {
      // Resolve existing alert
      existingAlert.status = 'resolved';
      existingAlert.resolvedAt = new Date();
      await this.notifier.sendAlertResolution(existingAlert, rule.channels);
      this.activeAlerts.delete(alertKey);
    }
  }

  // Public Getters
  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  getMetricHistory(metricName: string): Array<{ value: number; timestamp: Date }> {
    return this.evaluator.getMetricHistory(metricName);
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // Private Methods
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
    const defaultRules = DefaultAlertRules.getDefaultRules();
    defaultRules.forEach((rule) => this.addRule(rule));
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

  // Cleanup
  destroy(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }
  }
}

// Export singleton instance
export const apmAlerting = APMAlertingService.getInstance();