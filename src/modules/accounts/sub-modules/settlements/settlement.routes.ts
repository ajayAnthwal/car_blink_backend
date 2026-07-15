import { Router } from 'express';
import { validate } from '../../../../middlewares/validate.middleware';
import { generateSettlementSchema, processSettlementSchema } from './settlement.validation';
import { SettlementController } from './settlement.controller';

const router = Router();

router.get('/eligible-jobs', SettlementController.getEligibleJobsForSettlement);
router.post('/generate', validate({ body: generateSettlementSchema }), SettlementController.generateSettlement);
router.get('/', SettlementController.getAllSettlements);
router.patch('/:id/process', validate({ body: processSettlementSchema }), SettlementController.processSettlement);
router.get('/partner/:partnerId', SettlementController.getPartnerSettlementHistory);

export default router;
