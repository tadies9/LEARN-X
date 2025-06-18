import { API_CLIENT } from './client';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface NotificationResponse {
  data: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UnreadCountResponse {
  count: number;
}

export const notificationApi = {
  // Get user's notifications with pagination
  getNotifications: async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationResponse> => {
    const response = await API_CLIENT.get<{ success: boolean; data: NotificationResponse }>(
      '/notifications',
      { params }
    );
    return response.data.data;
  },

  // Get unread notification count
  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await API_CLIENT.get<{ success: boolean; data: UnreadCountResponse }>(
      '/notifications/unread-count'
    );
    return response.data.data;
  },

  // Mark notification as read
  markAsRead: async (id: string): Promise<void> => {
    await API_CLIENT.put(`/notifications/${id}/read`);
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    await API_CLIENT.put('/notifications/mark-all-read');
  },

  // Delete notification
  deleteNotification: async (id: string): Promise<void> => {
    await API_CLIENT.delete(`/notifications/${id}`);
  },
};
