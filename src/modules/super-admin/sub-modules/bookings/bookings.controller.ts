import { Response } from 'express';
import { superAdminBookingsService } from './bookings.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class SuperAdminBookingsController {
  public static getAllBookings = asyncHandler(async (req: IRequest, res: Response) => {
    const query = req.query;
    const result = await superAdminBookingsService.getAllBookings(query);
    return successResponse(res, result, 'Bookings retrieved successfully');
  });

  public static getBookingDetails = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const booking = await superAdminBookingsService.getBookingDetails(id);
    return successResponse(res, booking, 'Booking details retrieved successfully');
  });

  public static cancelBooking = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;
    const booking = await superAdminBookingsService.cancelBooking(id, reason);
    return successResponse(res, booking, 'Booking cancelled successfully');
  });
}

export default SuperAdminBookingsController;
