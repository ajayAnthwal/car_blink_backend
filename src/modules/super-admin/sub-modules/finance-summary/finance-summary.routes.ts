import { Router } from 'express';
import { validate } from '../../../../middlewares/validate.middleware';
import { financeSummaryQuerySchema } from './finance-summary.validation';
import { FinanceSummaryController } from './finance-summary.controller';

const router = Router();

router.get('/', validate({ query: financeSummaryQuerySchema }), FinanceSummaryController.getFinanceSummary);

export default router;
