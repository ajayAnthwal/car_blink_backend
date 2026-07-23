import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';
import { validate } from '../../../../middlewares/validate.middleware';
import { purchaseSubscriptionSchema } from './subscription.validation';

const router = Router();

router.post('/purchase', validate({ body: purchaseSubscriptionSchema }), SubscriptionController.purchase);
router.get('/my-subscriptions', SubscriptionController.getMySubscriptions);
router.get('/check-validity', SubscriptionController.checkValidity);

export default router;