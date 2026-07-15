import { Router } from 'express';
import { validate } from '../../../../middlewares/validate.middleware';
import { growthQuerySchema } from './growth.validation';
import { GrowthController } from './growth.controller';

const router = Router();

router.get('/users', validate({ query: growthQuerySchema }), GrowthController.getUserGrowth);
router.get('/bookings', validate({ query: growthQuerySchema }), GrowthController.getBookingGrowth);
router.get('/partner-funnel', GrowthController.getPartnerVerificationFunnel);

export default router;
