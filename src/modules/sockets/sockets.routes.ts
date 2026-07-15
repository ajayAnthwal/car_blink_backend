import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { SocketsController } from './sockets.controller';

const router = Router();

// Protected health endpoint to retrieve connection state (any authenticated role)
router.get('/status', authMiddleware, SocketsController.getSocketsStatus);

// Protected endpoint to trigger a test notification for real-time WebSocket delivery validation
router.post('/trigger-test', authMiddleware, SocketsController.triggerTestNotification);

export default router;
