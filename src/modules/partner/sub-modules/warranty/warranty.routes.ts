import { Router } from 'express';
import { PartnerWarrantyController } from './warranty.controller';
import { authMiddleware } from '../../../../middlewares/auth.middleware';
import { validate } from '../../../../middlewares/validate.middleware';
import { roleMiddleware } from '../../../../middlewares/role.middleware';
import { ROLES } from '../../../../common/constants/roles.constant';
import { z } from 'zod';

const router = Router();

// Validation schemas
const issueWarrantySchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  warrantyPeriodMonths: z.number().min(1, 'Warranty period must be at least 1 month'),
  startDate: z.string().datetime().optional(),
  warrantyDocumentUrl: z.string().url().optional(),
});

// Routes
router.post(
  '/issue',
  authMiddleware as any,
  roleMiddleware([ROLES.PARTNER]) as any,
  validate({ body: issueWarrantySchema }),
  PartnerWarrantyController.issueWarranty
);

router.get(
  '/',
  authMiddleware as any,
  roleMiddleware([ROLES.PARTNER]) as any,
  PartnerWarrantyController.getIssuedWarranties
);

export const partnerWarrantyRoutes = router;
export default partnerWarrantyRoutes;
