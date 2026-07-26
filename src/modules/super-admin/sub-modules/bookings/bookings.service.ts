import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';
import { BOOKING_STATUS } from '../../../../common/constants/status.constant';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { Types } from 'mongoose';

export class SuperAdminBookingsService {
  /**
   * Get all bookings with pagination and filters
   */
  async getAllBookings(query: any) {
    const { page = 1, limit = 10, status, search, fromDate, toDate } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (fromDate && toDate) {
      filter.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    } else if (fromDate) {
      filter.createdAt = { $gte: new Date(fromDate) };
    } else if (toDate) {
      filter.createdAt = { $lte: new Date(toDate) };
    }

    const bookings = await BookingModel.find(filter)
      .populate('customerId', 'fullName email phone')
      .populate('vehicleId', 'make model year registrationNumber')
      .populate('serviceId', 'name basePrice')
      .populate('cityId', 'name state')
      .populate('assignedExecutiveId', 'fullName phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await BookingModel.countDocuments(filter);

    return {
      docs: bookings,
      totalDocs: total,
      limit: Number(limit),
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      hasNextPage: skip + bookings.length < total,
      hasPrevPage: Number(page) > 1,
    };
  }

  /**
   * Get booking details
   */
  async getBookingDetails(bookingId: string) {
    const booking = await BookingModel.findById(bookingId)
      .populate('customerId', 'fullName email phone')
      .populate('vehicleId', 'make model year registrationNumber')
      .populate('serviceId', 'name basePrice category')
      .populate('cityId', 'name state')
      .populate('assignedExecutiveId', 'fullName phone email')
      .populate({
        path: 'acceptedBidId',
        populate: {
          path: 'partnerId',
          select: 'businessName userId contactNumber',
          populate: { path: 'userId', select: 'fullName email' }
        }
      })
      .lean();

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    return booking;
  }

  /**
   * Force cancel a booking as super admin
   */
  async cancelBooking(bookingId: string, reason: string) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    booking.status = BOOKING_STATUS.CANCELLED;
    booking.cancellationReason = `Super Admin: ${reason || 'Cancelled by administration'}`;
    await booking.save();

    return booking;
  }
}

export const superAdminBookingsService = new SuperAdminBookingsService();
