import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { NotificationController } from './notification.controller';

const router = Router();

// Protect all routes
router.use(authMiddleware as any);

router.get('/', NotificationController.getMyNotifications);
router.patch('/read-all', NotificationController.markAllAsRead);
router.patch('/:id/read', NotificationController.markAsRead);

export default router;
