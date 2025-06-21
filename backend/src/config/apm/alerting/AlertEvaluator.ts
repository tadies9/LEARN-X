import { logger } from '../../../utils/logger';
import { AlertRule, AlertEvent } from './types/alerting.types';

export class AlertEvaluator {
  private metricHistory: Map<string, Array<{ value: number; timestamp: Date }>> = new Map();
  private readonly HISTORY_RETENTION_MINUTES = 60;

  recordMetric(metricName: string, value: number): void {
    const now = new Date();
    const history = this.metricHistory.get(metricName) || [];

    // Add new value
    history.push({ value, timestamp: now });

    // Remove old values
    const cutoff = new Date(now.getTime() - this.HISTORY_RETENTION_MINUTES * 60 * 1000);
    const filteredHistory = history.filter((h) => h.timestamp > cutoff);

    this.metricHistory.set(metricName, filteredHistory);
  }

  evaluateRule(rule: AlertRule): { shouldTrigger: boolean; currentValue: number } | null {
    const metricHistory = this.metricHistory.get(rule.metric);
    if (!metricHistory || metricHistory.length === 0) return null;

    // Calculate metric value based on duration
    const durationMs = rule.duration * 60 * 1000;
    const cutoff = new Date(Date.now() - durationMs);
    const relevantValues = metricHistory.filter((h) => h.timestamp > cutoff).map((h) => h.value);

    if (relevantValues.length === 0) return null;

    // Calculate average value
    const currentValue = relevantValues.reduce((sum, val) => sum + val, 0) / relevantValues.length;

    // Check condition
    const shouldTrigger = this.evaluateCondition(rule.condition, currentValue, rule.threshold);

    return { shouldTrigger, currentValue };
  }

  createAlertEvent(rule: AlertRule, currentValue: number): AlertEvent {
    return {
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

  getMetricHistory(metricName: string): Array<{ value: number; timestamp: Date }> {
    return this.metricHistory.get(metricName) || [];
  }
}