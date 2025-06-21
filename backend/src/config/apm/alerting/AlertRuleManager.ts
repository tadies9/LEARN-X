import { logger } from '../../../utils/logger';
import { AlertRule } from './types/alerting.types';

export class AlertRuleManager {
  private rules: Map<string, AlertRule> = new Map();

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

  getEnabledRules(): AlertRule[] {
    return this.getRules().filter((rule) => rule.enabled);
  }

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
}