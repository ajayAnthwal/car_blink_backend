import { Router } from 'express';
import { validate } from '../../../../middlewares/validate.middleware';
import { rejectRefundSchema, processRefundSchema, initiateRefundSchema } from './refund.validation';
import { RefundController } from './refund.controller';
import { AdminRefundController } from '../../../super-admin/sub-modules/refunds/admin-refund.controller';

const router = Router();

router.get('/', RefundController.getAllRefunds);
router.get('/eligible-payments', AdminRefundController.getEligiblePayments);
router.post('/', validate({ body: initiateRefundSchema }), AdminRefundController.initiateRefund);
router.patch('/:id/approve', AdminRefundController.approveRefund);
router.patch('/:id/process', validate({ body: processRefundSchema }), RefundController.processRefund);
router.patch('/:id/reject', validate({ body: rejectRefundSchema }), RefundController.rejectRefund);

export default router;
