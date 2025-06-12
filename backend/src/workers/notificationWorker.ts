import { Job } from 'bull';
import { notificationQueue } from '../config/queue';
import { NotificationService } from '../services/notificationService';
import { logger } from '../utils/logger';

const notificationService = new NotificationService();

interface NotificationJobData {
  userId: string;
  type: 'file-processed' | 'file-failed' | 'course-shared' | 'embedding-complete';
  data: Record<string, any>;
}

// Process notifications
notificationQueue.process('send-notification', async (job: Job<NotificationJobData>) => {
  const { userId, type, data } = job.data;

  try {
    logger.info(`Sending notification type ${type} to user ${userId}`);

    switch (type) {
      case 'file-processed':
        await notificationService.sendFileProcessedNotification(userId, data as any);
        break;
      case 'file-failed':
        await notificationService.sendFileFailedNotification(userId, data as any);
        break;
      case 'course-shared':
        await notificationService.sendCourseSharedNotification(userId, data as any);
        break;
      case 'embedding-complete':
        await notificationService.sendEmbeddingCompleteNotification(userId, data as any);
        break;
      default:
        logger.warn(`Unknown notification type: ${type}`);
    }

    return { success: true };
  } catch (error) {
    logger.error(`Error sending notification:`, error);
    throw error;
  }
});

// Process batch notifications
notificationQueue.process(
  'send-batch-notifications',
  async (job: Job<{ notifications: NotificationJobData[] }>) => {
    const { notifications } = job.data;

    try {
      const results = await Promise.allSettled(
        notifications.map((notification) =>
          notificationService.sendNotification(
            notification.userId,
            notification.type,
            notification.data
          )
        )
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      logger.info(`Batch notifications sent: ${successful} successful, ${failed} failed`);

      return { successful, failed };
    } catch (error) {
      logger.error(`Error sending batch notifications:`, error);
      throw error;
    }
  }
);
