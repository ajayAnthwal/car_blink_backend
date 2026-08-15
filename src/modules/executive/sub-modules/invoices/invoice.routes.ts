import { Router } from 'express';
import { ExecutiveInvoiceController } from './invoice.controller';
import { authMiddleware } from '../../../../middlewares/auth.middleware';
import { roleMiddleware } from '../../../../middlewares/role.middleware';
import { ROLES } from '../../../../common/constants/roles.constant';

const router = Router();

// Partner submit invoice route
router.post(
  '/jobs/:jobId/invoice',
  authMiddleware as any,
  roleMiddleware([ROLES.PARTNER]) as any,
  ExecutiveInvoiceController.submitInvoiceByPartner
);

// Executive routes
router.get(
  '/executive/invoices',
  authMiddleware as any,
  roleMiddleware([ROLES.EXECUTIVE, ROLES.SUPER_ADMIN]) as any,
  ExecutiveInvoiceController.getAllInvoices
);

router.put(
  '/executive/invoices/:id',
  authMiddleware as any,
  roleMiddleware([ROLES.EXECUTIVE, ROLES.SUPER_ADMIN]) as any,
  ExecutiveInvoiceController.updateInvoice
);

router.post(
  '/executive/invoices/:id/approve',
  authMiddleware as any,
  roleMiddleware([ROLES.EXECUTIVE, ROLES.SUPER_ADMIN]) as any,
  ExecutiveInvoiceController.approveAndForwardInvoice
);

// Customer route to view approved invoice for a booking
router.get(
  '/customer/bookings/:bookingId/invoice',
  authMiddleware as any,
  ExecutiveInvoiceController.getInvoiceByBookingId
);

export default router;
