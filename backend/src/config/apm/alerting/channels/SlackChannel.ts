import { AlertEvent, AlertChannel } from '../types/alerting.types';
import { logger } from '../../../../utils/logger';

export class SlackChannel {
  static async sendAlert(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    const message = this.formatSlackMessage(alert);

    const response = await fetch(channel.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    logger.info(`Slack alert sent for ${alert.ruleName}`);
  }

  static async sendResolution(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    const message = this.formatSlackResolution(alert);

    await fetch(channel.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    logger.info(`Slack resolution sent for ${alert.ruleName}`);
  }

  private static formatSlackMessage(alert: AlertEvent): any {
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

  private static formatSlackResolution(alert: AlertEvent): any {
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

  private static getSeverityEmoji(severity: string): string {
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

  private static getSeverityColor(severity: string): string {
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
}