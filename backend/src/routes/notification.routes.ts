import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authenticateUser } from '../middleware/auth';

const router = Router();
const notificationController = new NotificationController();

// Apply auth middleware to all routes
router.use(authenticateUser);

// Notification routes
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

export default router;
