import { Response } from 'express';
import { BookingService } from './booking.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class BookingController {
  public static createBooking = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const booking = await BookingService.createBooking(String(customerId), req.body);
    return successResponse(res, booking, 'Booking created successfully', 201);
  });

  public static getMyBookings = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const result = await BookingService.getMyBookings(String(customerId), req.query);
    return successResponse(res, result, 'My bookings retrieved successfully');
  });

  public static getBookingById = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const { id } = req.params;
    const booking = await BookingService.getBookingById(String(customerId), id);
    return successResponse(res, booking, 'Booking details retrieved successfully');
  });

  public static cancelBooking = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const { id } = req.params;
    const { reason } = req.body;
    const booking = await BookingService.cancelBooking(String(customerId), id, reason);
    return successResponse(res, booking, 'Booking cancelled successfully');
  });

  public static getQuotes = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const { id } = req.params;
    const quotes = await BookingService.getQuotesForBooking(String(customerId), id);
    return successResponse(res, quotes, 'Booking quotes retrieved successfully');
  });

  public static selectQuote = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const { id } = req.params;
    const { bidId } = req.body;
    const booking = await BookingService.selectQuote(String(customerId), id, bidId);
    return successResponse(res, booking, 'Quote selected successfully');
  });

  public static respondToExtension = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const { id, extId } = req.params;
    const { status } = req.body; // 'APPROVED' | 'REJECTED'
    const job = await BookingService.respondToExtension(String(customerId), id, extId, status);
    return successResponse(res, job, 'Extension responded successfully');
  });

  public static getTracking = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const { id } = req.params;
    const logistics = await BookingService.getTracking(String(customerId), id);
    return successResponse(res, logistics, 'Tracking retrieved successfully');
  });

  public static applyCoupon = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const { id } = req.params;
    const { couponCode } = req.body;
    const booking = await BookingService.applyCoupon(String(customerId), id, couponCode);
    return successResponse(res, booking, 'Coupon applied successfully');
  });

  public static sendSatisfactionTemplate = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const booking = await BookingService.sendSatisfactionTemplate(id);
    return successResponse(res, booking, 'Satisfaction template sent to customer');
  });

  public static respondSatisfactionTemplate = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const { id } = req.params;
    const booking = await BookingService.respondSatisfactionTemplate(String(customerId), id, req.body);
    return successResponse(res, booking, 'Satisfaction feedback submitted successfully');
  });
}
export default BookingController;
