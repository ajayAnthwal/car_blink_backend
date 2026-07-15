import { Router } from 'express';
import { validate } from '../../../../middlewares/validate.middleware';
import { reportsHistoryQuerySchema } from './reports-history.validation';
import { ReportsHistoryController } from './reports-history.controller';

const router = Router();

router.get('/', validate({ query: reportsHistoryQuerySchema }), ReportsHistoryController.getReportsHistory);

export default router;
