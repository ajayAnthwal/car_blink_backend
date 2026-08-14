import { Router } from 'express';
import { validate } from '../../../../middlewares/validate.middleware';
import { rejectRefundSchema, processRefundSchema } from './refund.validation';
import { RefundController } from './refund.controller';

const router = Router();

router.get('/', RefundController.getAllRefunds);
router.patch('/:id/process', validate({ body: processRefundSchema }), RefundController.processRefund);
router.patch('/:id/reject', validate({ body: rejectRefundSchema }), RefundController.rejectRefund);

export default router;
