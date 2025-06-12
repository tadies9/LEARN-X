import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export class NotificationService {
  async sendNotification(userId: string, type: string, data: Record<string, any>) {
    try {
      // Store notification in database
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        type,
        title: this.getNotificationTitle(type, data),
        message: this.getNotificationMessage(type, data),
        data,
        read: false,
      });

      if (error) {
        throw error;
      }

      // In a real app, you might also:
      // - Send push notification
      // - Send email notification
      // - Send SMS
      // - Update real-time subscription

      logger.info(`Notification sent to user ${userId}`);
    } catch (error) {
      logger.error('Error sending notification:', error);
      throw error;
    }
  }

  async sendFileProcessedNotification(
    userId: string,
    data: {
      fileId: string;
      fileName: string;
      chunkCount: number;
    }
  ) {
    const { fileName, chunkCount } = data;

    await this.sendNotification(userId, 'file-processed', {
      ...data,
      title: 'File Processing Complete',
      message: `"${fileName}" has been processed successfully. Created ${chunkCount} chunks for AI-powered learning.`,
    });
  }

  async sendFileFailedNotification(
    userId: string,
    data: {
      fileId: string;
      fileName: string;
      error: string;
    }
  ) {
    const { fileName, error } = data;

    await this.sendNotification(userId, 'file-failed', {
      ...data,
      title: 'File Processing Failed',
      message: `Failed to process "${fileName}". Error: ${error}`,
    });
  }

  async sendCourseSharedNotification(
    userId: string,
    data: {
      courseId: string;
      courseName: string;
      sharedBy: string;
    }
  ) {
    const { courseName, sharedBy } = data;

    await this.sendNotification(userId, 'course-shared', {
      ...data,
      title: 'Course Shared With You',
      message: `${sharedBy} has shared the course "${courseName}" with you.`,
    });
  }

  async sendEmbeddingCompleteNotification(
    userId: string,
    data: {
      fileId: string;
      fileName: string;
    }
  ) {
    const { fileName } = data;

    await this.sendNotification(userId, 'embedding-complete', {
      ...data,
      title: 'AI Processing Complete',
      message: `"${fileName}" is now ready for AI-powered personalized learning.`,
    });
  }

  private getNotificationTitle(type: string, _data: Record<string, any>): string {
    switch (type) {
      case 'file-processed':
        return 'File Processing Complete';
      case 'file-failed':
        return 'File Processing Failed';
      case 'course-shared':
        return 'Course Shared With You';
      case 'embedding-complete':
        return 'AI Processing Complete';
      default:
        return 'Notification';
    }
  }

  private getNotificationMessage(type: string, data: Record<string, any>): string {
    switch (type) {
      case 'file-processed':
        return `File "${data.fileName}" has been processed successfully.`;
      case 'file-failed':
        return `Failed to process file "${data.fileName}".`;
      case 'course-shared':
        return `You have been given access to course "${data.courseName}".`;
      case 'embedding-complete':
        return `AI processing complete for "${data.fileName}".`;
      default:
        return 'You have a new notification.';
    }
  }

  async markAsRead(notificationId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }
}
