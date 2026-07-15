import { Router } from 'express';
import { validate } from '../../../../middlewares/validate.middleware';
import { revenueQuerySchema, revenueTrendQuerySchema } from './revenue.validation';
import { RevenueController } from './revenue.controller';

const router = Router();

router.get('/', validate({ query: revenueQuerySchema }), RevenueController.getRevenueSummary);
router.get('/trend', validate({ query: revenueTrendQuerySchema }), RevenueController.getRevenueTrend);

export default router;
