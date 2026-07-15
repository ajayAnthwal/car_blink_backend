import { Router } from 'express';
import { validate } from '../../../../middlewares/validate.middleware';
import { gstReportQuerySchema, invoiceReportQuerySchema } from './reports.validation';
import { ReportsController } from './reports.controller';

const router = Router();

router.get('/gst', validate({ query: gstReportQuerySchema }), ReportsController.getGstReport);
router.get('/invoices', validate({ query: invoiceReportQuerySchema }), ReportsController.getInvoiceReport);

export default router;
