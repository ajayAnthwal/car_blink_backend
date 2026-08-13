import { Router } from 'express';
import { ActivityLogController } from './activity-log.controller';

const router = Router();

router.get('/', ActivityLogController.getRecentLogs);

export default router;
