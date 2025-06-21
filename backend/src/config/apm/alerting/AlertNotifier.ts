import { logger } from '../../../utils/logger';
import { AlertEvent, AlertChannel, AlertingConfig } from './types/alerting.types';
import { SlackChannel } from './channels/SlackChannel';
import { EmailChannel } from './channels/EmailChannel';
import { WebhookChannel } from './channels/WebhookChannel';
import { PagerDutyChannel } from './channels/PagerDutyChannel';

export class AlertNotifier {
  constructor(private config: AlertingConfig) {}

  async sendAlert(alert: AlertEvent, channels: AlertChannel[]): Promise<void> {
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

  async sendAlertResolution(alert: AlertEvent, channels: AlertChannel[]): Promise<void> {
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
        await SlackChannel.sendAlert(alert, channel);
        break;
      case 'email':
        await EmailChannel.sendAlert(alert, channel);
        break;
      case 'webhook':
        await WebhookChannel.sendAlert(alert, channel);
        break;
      case 'pagerduty':
        await PagerDutyChannel.sendAlert(alert, channel);
        break;
      default:
        logger.warn(`Unknown alert channel type: ${channel.type}`);
    }
  }

  private async sendResolutionToChannel(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    switch (channel.type) {
      case 'slack':
        await SlackChannel.sendResolution(alert, channel);
        break;
      case 'email':
        await EmailChannel.sendResolution(alert, channel);
        break;
      case 'webhook':
        await WebhookChannel.sendResolution(alert, channel);
        break;
      case 'pagerduty':
        await PagerDutyChannel.sendResolution(alert, channel);
        break;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}