import { Router } from 'express';
import { SuperAdminSettlementsController } from './settlements.controller';

const router = Router();

router.get('/', SuperAdminSettlementsController.getAllSettlements);
router.post('/', SuperAdminSettlementsController.createSettlement);
router.patch('/:id/mark-paid', SuperAdminSettlementsController.markAsPaid);

export default router;
