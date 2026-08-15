import { Router } from 'express';
import { BookingController } from './booking.controller';
import { validate } from '../../../../middlewares/validate.middleware';
import { createBookingSchema, cancelBookingSchema, selectQuoteSchema } from './booking.validation';

const router = Router();

router.post('/', validate({ body: createBookingSchema }), BookingController.createBooking);
router.get('/', BookingController.getMyBookings);
router.get('/:id', BookingController.getBookingById);
router.patch('/:id/cancel', validate({ body: cancelBookingSchema }), BookingController.cancelBooking);
router.get('/:id/quotes', BookingController.getQuotes);
router.patch(
  '/:id/quotes',
  validate({ body: selectQuoteSchema }),
  BookingController.selectQuote
);

// Respond to job extension
router.patch(
  '/:id/extensions/:extId',
  BookingController.respondToExtension
);

// Apply Coupon
router.post('/:id/coupon', BookingController.applyCoupon);

// Get tracking info
router.get('/:id/tracking', BookingController.getTracking);

// Satisfaction Template Routes
router.post('/:id/satisfaction/send', BookingController.sendSatisfactionTemplate);
router.post('/:id/satisfaction/respond', BookingController.respondSatisfactionTemplate);

export default router;
