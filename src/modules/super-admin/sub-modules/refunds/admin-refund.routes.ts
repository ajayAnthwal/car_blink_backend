import { Router } from 'express';
import { validate } from '../../../../middlewares/validate.middleware';
import { initiateRefundSchema } from '../../../accounts/sub-modules/refunds/refund.validation';
import { AdminRefundController } from './admin-refund.controller';

const router = Router();

router.get('/', AdminRefundController.getAllRefunds);
router.get('/eligible-payments', AdminRefundController.getEligiblePayments);
router.post('/', validate({ body: initiateRefundSchema }), AdminRefundController.initiateRefund);
router.patch('/:id/approve', AdminRefundController.approveRefund);

export default router;
