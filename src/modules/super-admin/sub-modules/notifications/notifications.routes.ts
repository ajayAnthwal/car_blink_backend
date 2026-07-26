import { Router } from 'express';
import { SuperAdminNotificationsController } from './notifications.controller';

const router = Router();

router.get('/', SuperAdminNotificationsController.getHistory);
router.post('/send', SuperAdminNotificationsController.sendNotification);

export default router;
