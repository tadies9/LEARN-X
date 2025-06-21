import { AlertEvent, AlertChannel } from '../types/alerting.types';
import { logger } from '../../../../utils/logger';

export class PagerDutyChannel {
  static async sendAlert(alert: AlertEvent, channel: AlertChannel): Promise<void> {
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

    logger.info(`PagerDuty alert sent for ${alert.ruleName}`);
  }

  static async sendResolution(alert: AlertEvent, channel: AlertChannel): Promise<void> {
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

    logger.info(`PagerDuty resolution sent for ${alert.ruleName}`);
  }
}