import { Router } from 'express';
import { validate } from '../../../../middlewares/validate.middleware';
import { commissionQuerySchema, partnerCommissionQuerySchema } from './commission.validation';
import { CommissionController } from './commission.controller';

const router = Router();

router.get('/', validate({ query: commissionQuerySchema }), CommissionController.getCommissionReport);
router.get('/partner/:partnerId', validate({ query: partnerCommissionQuerySchema }), CommissionController.getCommissionByPartner);

export default router;
