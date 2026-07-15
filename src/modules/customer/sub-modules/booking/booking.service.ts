import { BookingModel, IBooking } from './booking.model';
import { GarageModel } from '../garage/garage.model';
import { ServiceModel } from '../../../master-data/models/service.model';
import { CityModel } from '../../../master-data/models/city.model';
import { BidModel } from '../../../partner/sub-modules/bidding/bid.model';
import { JobModel } from '../../../partner/sub-modules/jobs/job.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { UnauthorizedError } from '../../../../common/errors/UnauthorizedError';
import { ApiError } from '../../../../common/errors/ApiError';
import { BOOKING_STATUS } from '../../../../common/constants/status.constant';
import { ERROR_CODES } from '../../../../common/constants/error-codes.constant';

export class BookingService {
  public static async createBooking(
    customerId: string,
    data: {
      vehicleId: string;
      serviceId: string;
      cityId: string;
      description?: string;
      preferredDate?: string;
    }
  ): Promise<IBooking> {
    // 1. Verify vehicle ownership
    const vehicle = await GarageModel.findOne({ _id: data.vehicleId, isActive: true });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found in garage');
    }
    if (vehicle.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You do not own this vehicle');
    }

    // 2. Verify service exists
    const service = await ServiceModel.findOne({ _id: data.serviceId, isActive: true });
    if (!service) {
      throw new NotFoundError('Service category not found or inactive');
    }

    // 3. Verify city exists
    const city = await CityModel.findOne({ _id: data.cityId, isActive: true });
    if (!city) {
      throw new NotFoundError('City not found or inactive');
    }

    // 4. Create booking
    const booking = await BookingModel.create({
      customerId,
      vehicleId: data.vehicleId,
      serviceId: data.serviceId,
      cityId: data.cityId,
      description: data.description,
      preferredDate: data.preferredDate ? new Date(data.preferredDate) : undefined,
      status: BOOKING_STATUS.PENDING,
    });

    return booking;
  }

  public static async getMyBookings(
    customerId: string,
    query: { status?: string; page?: string; limit?: string }
  ): Promise<{ bookings: IBooking[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = { customerId };
    if (query.status && Object.values(BOOKING_STATUS).includes(query.status as BOOKING_STATUS)) {
      filter.status = query.status;
    }

    const [bookings, total] = await Promise.all([
      BookingModel.find(filter)
        .populate('vehicleId')
        .populate('serviceId')
        .populate('cityId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BookingModel.countDocuments(filter),
    ]);

    return { bookings, total, page, limit };
  }

  public static async getBookingById(customerId: string, bookingId: string): Promise<IBooking> {
    const booking = await BookingModel.findById(bookingId)
      .populate('vehicleId')
      .populate('serviceId')
      .populate('cityId');

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You are not authorized to view this booking');
    }

    return booking;
  }

  public static async cancelBooking(
    customerId: string,
    bookingId: string,
    reason: string
  ): Promise<IBooking> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You are not authorized to cancel this booking');
    }

    // Only allow cancellation if status is PENDING or QUOTED
    if (
      booking.status !== BOOKING_STATUS.PENDING &&
      booking.status !== BOOKING_STATUS.QUOTED
    ) {
      throw new ApiError(
        400,
        `Cannot cancel booking in ${booking.status} status`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    booking.status = BOOKING_STATUS.CANCELLED;
    booking.cancellationReason = reason;
    return booking.save();
  }

  public static async getQuotesForBooking(
    customerId: string,
    bookingId: string
  ): Promise<any[]> {
    // 1. Verify ownership of booking
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }
    if (booking.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You are not authorized to view quotes for this booking');
    }

    // 2. Fetch all bids
    const bids = await BidModel.find({ bookingId, status: { $ne: 'WITHDRAWN' } })
      .populate({
        path: 'partnerId',
        populate: { path: 'userId', select: 'fullName email phone' }
      });

    return bids;
  }

  public static async selectQuote(
    customerId: string,
    bookingId: string,
    bidId: string
  ): Promise<IBooking> {
    // 1. Verify ownership of booking
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }
    if (booking.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You are not authorized to select quotes for this booking');
    }

    // Booking must be PENDING or QUOTED
    if (booking.status !== BOOKING_STATUS.PENDING && booking.status !== BOOKING_STATUS.QUOTED) {
      throw new ApiError(
        400,
        `Cannot select quote for booking in ${booking.status} status`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // 2. Verify bid exists and belongs to this booking
    const selectedBid = await BidModel.findById(bidId);
    if (!selectedBid) {
      throw new NotFoundError('Bid not found');
    }
    if (selectedBid.bookingId.toString() !== bookingId) {
      throw new ApiError(400, 'Bid does not belong to this booking', ERROR_CODES.VALIDATION_ERROR);
    }
    if (selectedBid.status !== 'PENDING') {
      throw new ApiError(400, 'Bid is not in PENDING status', ERROR_CODES.VALIDATION_ERROR);
    }

    // 3. Mark selected bid as ACCEPTED, others as REJECTED
    selectedBid.status = 'ACCEPTED';
    await selectedBid.save();

    await BidModel.updateMany(
      { bookingId, _id: { $ne: bidId }, status: 'PENDING' },
      { $set: { status: 'REJECTED' } }
    );

    // 4. Update Booking status to ACCEPTED and acceptedBidId
    booking.status = BOOKING_STATUS.ACCEPTED;
    booking.acceptedBidId = selectedBid._id;
    await booking.save();

    // 5. Auto-create a Job document in NOT_STARTED status
    await JobModel.create({
      bookingId: booking._id,
      partnerId: selectedBid.partnerId,
      bidId: selectedBid._id,
      status: 'NOT_STARTED',
      finalAmount: selectedBid.quotedAmount,
    });

    return booking;
  }
}
export default BookingService;
