import { Router } from 'express';
import { LogisticsController } from './logistics.controller';
const router = Router();
router.post('/assign', LogisticsController.assign);
router.patch('/:id/location', LogisticsController.updateLocation);
export default router;