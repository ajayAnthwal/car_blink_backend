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
router.post('/:id/select-quote', validate({ body: selectQuoteSchema }), BookingController.selectQuote);

export default router;
