import { AlertEvent, AlertChannel } from '../types/alerting.types';
import { logger } from '../../../../utils/logger';

export class WebhookChannel {
  static async sendAlert(alert: AlertEvent, channel: AlertChannel): Promise<void> {
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

    logger.info(`Webhook alert sent for ${alert.ruleName}`);
  }

  static async sendResolution(alert: AlertEvent, channel: AlertChannel): Promise<void> {
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

    logger.info(`Webhook resolution sent for ${alert.ruleName}`);
  }
}