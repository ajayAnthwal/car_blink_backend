import { Router } from 'express';
import { superAdminTaxReportsController } from './tax-reports.controller';

const router = Router();

router.get('/export', superAdminTaxReportsController.exportTaxReport);

export default router;
