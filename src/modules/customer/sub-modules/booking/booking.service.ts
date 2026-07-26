import mongoose from 'mongoose';
import { BookingModel, IBooking } from './booking.model';
import { GarageModel } from '../garage/garage.model';
import { ServiceModel } from '../../../master-data/models/service.model';
import { CityModel } from '../../../master-data/models/city.model';
import { BidModel } from '../../../partner/sub-modules/bidding/bid.model';
import { JobModel } from '../../../partner/sub-modules/jobs/job.model';
import { PartnerModel } from '../../../partner/partner.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { UnauthorizedError } from '../../../../common/errors/UnauthorizedError';
import { ApiError } from '../../../../common/errors/ApiError';
import { BOOKING_STATUS } from '../../../../common/constants/status.constant';
import { ERROR_CODES } from '../../../../common/constants/error-codes.constant';
import { emitToUser, emitToRole } from '../../../../sockets';

export class BookingService {
  public static async createBooking(
    customerId: string,
    data: {
      vehicleId: string;
      serviceId: string;
      cityId: string;
      description?: string;
      preferredDate?: string;
      latitude?: number;
      longitude?: number;
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

    // 3. Verify city exists (Bypassed for frontend custom package locations)
    // const city = await CityModel.findOne({ _id: data.cityId, isActive: true });
    // if (!city) {
    //   throw new NotFoundError('City not found or inactive');
    // }

    // 4. Create booking
    const bookingData: any = {
      customerId,
      vehicleId: data.vehicleId,
      serviceId: data.serviceId,
      cityId: data.cityId,
      description: data.description,
      preferredDate: data.preferredDate ? new Date(data.preferredDate) : undefined,
      status: BOOKING_STATUS.PENDING,
    };

    if (data.latitude !== undefined && data.longitude !== undefined) {
      bookingData.location = {
        type: 'Point',
        coordinates: [data.longitude, data.latitude] // GeoJSON is [lng, lat]
      };
    }

    const booking = await BookingModel.create(bookingData);

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

  public static async getBookingById(customerId: string, bookingId: string): Promise<any> {
    const booking = await BookingModel.findById(bookingId)
      .populate('vehicleId')
      .populate('serviceId')
      .populate('cityId')
      .lean();

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You are not authorized to view this booking');
    }

    // Fetch associated job details (which includes photos and extensions)
    const jobDetails = await JobModel.findOne({ bookingId }).lean();
    
    // Fetch payments
    const PaymentModel = mongoose.model('Payment');
    const payments = await PaymentModel.find({ bookingId }).lean();

    return {
      ...booking,
      jobDetails: jobDetails || null,
      payments: payments || []
    };
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

    // 2. Fetch the forwarded bids (if they exist)
    if (!booking.forwardedBidIds || booking.forwardedBidIds.length === 0) {
      return [];
    }

    const bids = await BidModel.find({ _id: { $in: booking.forwardedBidIds }, status: { $ne: 'WITHDRAWN' } })
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
    const selectedBid = await BidModel.findById(bidId).populate('partnerId');
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

    // 5. Emit live socket events
    const partnerUserId = (selectedBid.partnerId as any)?.userId?.toString();
    const executiveUserId = booking.assignedExecutiveId?.toString();

    const eventPayload = {
      bookingId: booking._id,
      status: BOOKING_STATUS.ACCEPTED,
      message: 'Booking confirmed and quote accepted.'
    };

    if (partnerUserId) {
      emitToUser(partnerUserId, 'quote_accepted', eventPayload);
    }
    if (executiveUserId) {
      emitToUser(executiveUserId, 'booking_confirmed', eventPayload);
    }
    emitToRole('SUPER_ADMIN', 'booking_confirmed', eventPayload);

    // 6. Auto-create a Job document in NOT_STARTED status
    const job = await JobModel.create({
      bookingId: booking._id,
      partnerId: selectedBid.partnerId,
      bidId: selectedBid._id,
      status: 'NOT_STARTED',
      finalAmount: selectedBid.quotedAmount,
    });

    // 6. Trigger notifications
    try {
      const { notificationService } = require('../../../notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');

      // A. Notify the winning partner
      const winningPartner = await PartnerModel.findById(selectedBid.partnerId);
      if (winningPartner) {
        await notificationService.sendNotification(
          winningPartner.userId.toString(),
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.QUOTE_ACCEPTED,
          'Your Quote Was Accepted!',
          `Your quote of INR ${selectedBid.quotedAmount} for booking ${booking._id} has been accepted.`,
          { bookingId: booking._id.toString(), jobId: job._id.toString() }
        );
      }

      // B. Notify the customer
      await notificationService.sendNotification(
        booking.customerId.toString(),
        NOTIFICATION_TYPE.EMAIL,
        NOTIFICATION_CATEGORY.QUOTE_ACCEPTED,
        'Booking Quote Accepted',
        `You have accepted the quote for booking ${booking._id}. The job will start soon.`,
        { bookingId: booking._id.toString() }
      );

      // C. Notify rejected partners
      const rejectedBids = await BidModel.find({ bookingId, _id: { $ne: bidId } });
      const rejectedPartnerIds = rejectedBids.map((b) => b.partnerId);
      const rejectedPartners = await PartnerModel.find({ _id: { $in: rejectedPartnerIds } });

      for (const partner of rejectedPartners) {
        await notificationService.sendNotification(
          partner.userId.toString(),
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.QUOTE_ACCEPTED,
          'Quote Not Selected',
          `Your quote for booking ${booking._id} was not selected. Keep bidding!`,
          { bookingId: booking._id.toString() }
        );
      }
    } catch (notifErr: any) {
      const { logger } = require('../../../../config/logger.config');
      logger.warn('Failed to send quote selection notifications:', notifErr);
    }

    return booking;
  }
  public static async respondToExtension(
    customerId: string,
    bookingId: string,
    extId: string,
    status: 'APPROVED' | 'REJECTED'
  ): Promise<any> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking not found');
    if (booking.customerId.toString() !== customerId) {
      throw new UnauthorizedError('Not authorized');
    }

    const job = await JobModel.findOne({ bookingId });
    if (!job) throw new NotFoundError('Job not found for this booking');

    const extension = job.jobExtensions.find(e => e._id?.toString() === extId);
    if (!extension) throw new NotFoundError('Extension not found');
    if (extension.status !== 'PENDING') {
      throw new ApiError(400, 'Extension is already processed', ERROR_CODES.VALIDATION_ERROR);
    }

    extension.status = status;
    
    // if approved, add cost to finalAmount
    if (status === 'APPROVED') {
      job.finalAmount = (job.finalAmount || 0) + extension.cost;
    }
    await job.save();

    // notify partner
    try {
      const { notificationService } = require('../../../notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');
      const partner = await PartnerModel.findById(job.partnerId);
      if (partner) {
        await notificationService.sendNotification(
          partner.userId.toString(),
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.GENERAL,
          `Extension ${status}`,
          `Customer has ${status} the extra part request (${extension.partName}).`,
          { jobId: job._id.toString() }
        );
      }
    } catch (e) {
      console.warn('Failed to send partner notification', e);
    }

    return job;
  }

  public static async getTracking(customerId: string, bookingId: string): Promise<any> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking not found');
    if (booking.customerId.toString() !== customerId) {
      throw new UnauthorizedError('Not authorized');
    }

    const { default: LogisticsModel } = require('../../../executive/sub-modules/logistics/logistics.model');
    const logistics = await LogisticsModel.findOne({ bookingId }).sort({ createdAt: -1 });
    if (!logistics) {
      throw new NotFoundError('No active logistics tracking found for this booking');
    }
    
    return logistics;
  }
}
export default BookingService;
