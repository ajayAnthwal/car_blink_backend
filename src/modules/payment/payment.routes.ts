import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { ROLES } from '../../common/constants/roles.constant';
import { validate } from '../../middlewares/validate.middleware';
import { PaymentController } from './payment.controller';
import { initiatePaymentSchema, verifyPaymentSchema } from './payment.validation';

const router = Router();

// Public route for Razorpay webhook
router.post('/webhook', PaymentController.webhook);

// Protected routes (CUSTOMER role only)
router.use(authMiddleware as any);
router.use(roleMiddleware([ROLES.CUSTOMER]) as any);

router.post('/initiate', validate({ body: initiatePaymentSchema }), PaymentController.initiate);
router.post('/verify', validate({ body: verifyPaymentSchema }), PaymentController.verify);
router.get('/history', PaymentController.getHistory);
router.get('/:id', PaymentController.getById);

export default router;
