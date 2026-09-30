import { Router } from 'express';
import { SuperAdminBookingsController } from './bookings.controller';

const router = Router();

router.get('/', SuperAdminBookingsController.getAllBookings);
router.get('/:id', SuperAdminBookingsController.getBookingDetails);
router.put('/:id/cancel', SuperAdminBookingsController.cancelBooking);
router.post('/:id/manual-assign', SuperAdminBookingsController.manualAssignAndBypass);

export default router;
