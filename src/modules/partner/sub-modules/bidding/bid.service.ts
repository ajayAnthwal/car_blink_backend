import { BidModel, IBid } from './bid.model';
import { PartnerModel } from '../../partner.model';
import { BookingModel, IBooking } from '../../../customer/sub-modules/booking/booking.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { UnauthorizedError } from '../../../../common/errors/UnauthorizedError';
import { ConflictError } from '../../../../common/errors/ConflictError';
import { ApiError } from '../../../../common/errors/ApiError';
import { BOOKING_STATUS } from '../../../../common/constants/status.constant';
import { ERROR_CODES } from '../../../../common/constants/error-codes.constant';

export class BidService {
  public static async getAvailableLeads(
    userId: string,
    query: { page?: string; limit?: string }
  ): Promise<{ bookings: IBooking[]; total: number; page: number; limit: number }> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    // Find bookings that this partner has already bid on
    const partnerBids = await BidModel.find({ partnerId: partner._id }).select('bookingId');
    const biddedBookingIds = partnerBids.map((b) => b.bookingId);

    // Find explicitly assigned leads
    const { AssignmentModel } = require('../../../executive/sub-modules/lead-assignment/assignment.model');
    const assignedLeads = await AssignmentModel.find({ assignedPartnerIds: partner._id }).select('bookingId');
    const assignedBookingIds = assignedLeads.map((a: any) => a.bookingId);

    // Bookings must:
    // - Be in PENDING status
    // - NOT be already bidded on by this partner
    // - EITHER match the partner's city & services OR be explicitly assigned to them
    const filter: any = {
      status: BOOKING_STATUS.PENDING,
      _id: { $nin: biddedBookingIds },
      $or: [
        {
          cityId: partner.cityId,
          serviceId: { $in: partner.servicesOffered }
        },
        { _id: { $in: assignedBookingIds } }
      ]
    };

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

  public static async placeBid(
    userId: string,
    data: { bookingId: string; quotedAmount: number; estimatedDuration?: string; notes?: string }
  ): Promise<IBid> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    // 1. Verify booking exists and status is PENDING or QUOTED (leads can still receive bids if already quoted by someone else)
    const booking = await BookingModel.findById(data.bookingId);
    if (!booking) {
      throw new NotFoundError('Booking lead not found');
    }

    if (
      booking.status !== BOOKING_STATUS.PENDING &&
      booking.status !== BOOKING_STATUS.QUOTED
    ) {
      throw new ApiError(
        400,
        `Cannot bid on booking in ${booking.status} status`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // 2. Verify duplicate check
    const existingBid = await BidModel.findOne({
      bookingId: data.bookingId,
      partnerId: partner._id,
    });
    if (existingBid) {
      throw new ConflictError('You have already placed a bid on this booking');
    }

    // 3. Create Bid
    const bid = await BidModel.create({
      bookingId: data.bookingId,
      partnerId: partner._id,
      quotedAmount: data.quotedAmount,
      estimatedDuration: data.estimatedDuration,
      notes: data.notes,
      status: 'PENDING',
    });

    // Notify Executive, Admin and Customer of the new quote
    try {
      const { notificationService } = require('../../../notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');
      const { emitToRole, emitToUser } = require('../../../../sockets');
      
      const payload = { bookingId: booking._id.toString(), bidId: bid._id.toString() };

      // Live socket events
      emitToRole('SUPER_ADMIN', 'quote_received', payload);
      emitToRole('EXECUTIVE', 'quote_received', payload);
      if (booking.customerId) {
        emitToUser(booking.customerId.toString(), 'quote_received', payload);
      }
      
      const title = 'New Partner Bid Received';
      const msg = `${partner.businessName} has submitted a bid of INR ${data.quotedAmount}.`;

      // In-app Notifications
      if (booking.assignedExecutiveId) {
        await notificationService.sendNotification(
          booking.assignedExecutiveId.toString(),
          NOTIFICATION_TYPE.SYSTEM,
          NOTIFICATION_CATEGORY.BID_RECEIVED,
          title, msg, payload
        );
      }
      // Broadcast to all executives and super admins as fallback/cc
      await notificationService.sendToRole('SUPER_ADMIN', NOTIFICATION_TYPE.SYSTEM, NOTIFICATION_CATEGORY.BID_RECEIVED, title, msg, payload);
      await notificationService.sendToRole('EXECUTIVE', NOTIFICATION_TYPE.SYSTEM, NOTIFICATION_CATEGORY.BID_RECEIVED, title, msg, payload);
      
    } catch (notifErr: any) {
      const { logger } = require('../../../../config/logger.config');
      logger.warn('Failed to send bid received notification:', notifErr);
    }

    return bid;
  }

  public static async getMyBids(
    userId: string,
    query: { status?: string; page?: string; limit?: string }
  ): Promise<{ bids: IBid[]; total: number; page: number; limit: number }> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = { partnerId: partner._id };
    if (query.status) {
      filter.status = query.status;
    }

    const [bids, total] = await Promise.all([
      BidModel.find(filter)
        .populate({
          path: 'bookingId',
          populate: [
            { path: 'vehicleId' },
            { path: 'serviceId' },
            { path: 'cityId' }
          ],
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BidModel.countDocuments(filter),
    ]);

    return { bids, total, page, limit };
  }

  public static async withdrawBid(userId: string, bidId: string): Promise<IBid> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    const bid = await BidModel.findById(bidId);
    if (!bid) {
      throw new NotFoundError('Bid not found');
    }

    if (bid.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError('You are not authorized to withdraw this bid');
    }

    if (bid.status !== 'PENDING') {
      throw new ApiError(
        400,
        `Cannot withdraw bid in ${bid.status} status`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    bid.status = 'WITHDRAWN';
    return bid.save();
  }
}
export default BidService;
