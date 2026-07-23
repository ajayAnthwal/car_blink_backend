import { Router } from 'express';
import { ReferralController } from './referral.controller';
import { validate } from '../../../../middlewares/validate.middleware';
import { applyReferralSchema } from './referral.validation';

const router = Router();

router.post('/apply', validate({ body: applyReferralSchema }), ReferralController.apply);

export default router;