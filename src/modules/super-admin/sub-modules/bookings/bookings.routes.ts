import { Router } from 'express';
import { SuperAdminBookingsController } from './bookings.controller';
import { roleMiddleware } from '../../../../middlewares/role.middleware';
import { validate } from '../../../../middlewares/validate.middleware';
import { ROLES } from '../../../../common/constants/roles.constant';
import { manualAssignBypassSchema } from './bookings.validation';

const router = Router();

router.get('/', SuperAdminBookingsController.getAllBookings);
router.get('/:id', SuperAdminBookingsController.getBookingDetails);
router.put('/:id/cancel', SuperAdminBookingsController.cancelBooking);
router.post(
  '/:id/manual-assign',
  roleMiddleware([ROLES.SUPER_ADMIN]) as any,
  validate({ body: manualAssignBypassSchema }) as any,
  SuperAdminBookingsController.manualAssignAndBypass
);
router.get('/:id/eligible-partners', SuperAdminBookingsController.getEligiblePartners);

export default router;
