import { Router } from 'express';
import { CustomerInvoiceController } from './customer-invoice.controller';

const router = Router();

router.get('/', CustomerInvoiceController.getMyInvoices);
router.get('/:bookingId', CustomerInvoiceController.getInvoiceByBooking);

export default router;
