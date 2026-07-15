import { Router } from 'express';
import { LeadsTodayController } from './leads-today.controller';

const router = Router();

router.get('/stats', LeadsTodayController.getTodaysLeadsStats);
router.get('/list', LeadsTodayController.getTodaysLeadsList);

export default router;
