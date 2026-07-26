import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { ROLES } from '../../common/constants/roles.constant';
import { validate } from '../../middlewares/validate.middleware';
import { PaymentController } from './payment.controller';
import { initiatePaymentSchema, verifyPaymentSchema, verifyOfflinePaymentSchema } from './payment.validation';

const router = Router();

// Public route for Razorpay webhook
router.post('/webhook', PaymentController.webhook);

// Protected routes
router.use(authMiddleware as any);

router.post('/initiate', roleMiddleware([ROLES.CUSTOMER]) as any, validate({ body: initiatePaymentSchema }), PaymentController.initiate);
router.post('/verify', roleMiddleware([ROLES.CUSTOMER]) as any, validate({ body: verifyPaymentSchema }), PaymentController.verify);
router.post('/offline', roleMiddleware([ROLES.CUSTOMER, ROLES.PARTNER]) as any, validate({ body: initiatePaymentSchema }), PaymentController.markOffline);
router.post('/offline/verify', roleMiddleware([ROLES.PARTNER]) as any, validate({ body: verifyOfflinePaymentSchema }), PaymentController.verifyOffline);
router.get('/history', roleMiddleware([ROLES.CUSTOMER]) as any, PaymentController.getHistory);
router.get('/:id', roleMiddleware([ROLES.CUSTOMER]) as any, PaymentController.getById);

export default router;
