import { Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { AppError } from '../utils/errors';
import { supabase } from '../config/supabase';

export class NotificationController {
  private notificationService = new NotificationService();

  getNotifications = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 20, unreadOnly } = req.query;

      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', unreadOnly === 'true' ? false : undefined)
        .order('created_at', { ascending: false })
        .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

      if (error) {
        throw new AppError('Failed to fetch notifications', 500);
      }

      res.json(notifications || []);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to fetch notifications' });
      }
    }
  };

  getUnreadCount = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const count = await this.notificationService.getUnreadCount(userId);

      res.json({ count });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  };

  markAsRead = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await this.notificationService.markAsRead(id, userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  };

  markAllAsRead = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      await this.notificationService.markAllAsRead(userId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  };

  deleteNotification = async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        throw new AppError('Failed to delete notification', 500);
      }

      res.status(204).send();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete notification' });
      }
    }
  };
}
