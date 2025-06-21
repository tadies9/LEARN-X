import { AlertEvent, AlertChannel } from '../types/alerting.types';
import { logger } from '../../../../utils/logger';

export class EmailChannel {
  static async sendAlert(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    // Implementation would depend on your email service
    logger.info(`Email alert sent to ${channel.endpoint} for ${alert.ruleName}`);
  }

  static async sendResolution(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    logger.info(`Email resolution sent to ${channel.endpoint} for ${alert.ruleName}`);
  }
}