import mongoose from 'mongoose';
import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';
import { PartnerModel } from '../../../partner/partner.model';
import { BidModel } from '../../../partner/sub-modules/bidding/bid.model';
import { AssignmentModel } from './assignment.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { BadRequestError } from '../../../../common/errors/BadRequestError';
import { ASSIGNMENT_TYPE, BOOKING_STATUS } from '../../../../common/constants/status.constant';

export class AssignmentService {
  /**
   * Get all leads (bookings) with their assignment details
   */
  async getAllLeads(query: any = {}): Promise<{ leads: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) {
      if (Array.isArray(query.status)) {
        filter.status = { $in: query.status };
      } else if (typeof query.status === 'string' && query.status.includes(',')) {
        filter.status = { $in: query.status.split(',').map((s: string) => s.trim()) };
      } else {
        filter.status = query.status;
      }
    }
    console.log("DEBUG FILTER:", filter);
    if (query.cityId) filter.cityId = query.cityId;
    if (query.serviceId) filter.serviceId = query.serviceId;

    const [bookings, total] = await Promise.all([
      BookingModel.find(filter)
        .populate('customerId', 'fullName email phone')
        .populate('vehicleId', 'brand model registrationNumber fuelType')
        .populate('serviceId', 'name description basePrice')
        .populate('cityId', 'name state')
        .populate('assignedExecutiveId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BookingModel.countDocuments(filter),
    ]);

    const bookingIds = bookings.map((b: any) => b._id);
    const assignments = await AssignmentModel.find({ bookingId: { $in: bookingIds } })
      .populate('assignedExecutiveId', 'fullName email')
      .populate('assignedPartnerIds', 'businessName isVerified')
      .lean();

    const bids = await BidModel.find({ bookingId: { $in: bookingIds } })
      .populate({
        path: 'partnerId',
        select: 'businessName isVerified rating'
      })
      .lean();

    const assignmentMap = new Map();
    assignments.forEach((a: any) => assignmentMap.set(a.bookingId.toString(), a));

    const bidsMap = new Map();
    bids.forEach((b: any) => {
      const bidList = bidsMap.get(b.bookingId.toString()) || [];
      bidList.push(b);
      bidsMap.set(b.bookingId.toString(), bidList);
    });

    const leads = bookings.map((booking: any) => ({
      ...booking,
      assignment: assignmentMap.get(booking._id.toString()) || null,
      bids: bidsMap.get(booking._id.toString()) || [],
    }));

    return { leads, total, page, limit };
  }

  /**
   * Get lead details by booking ID
   */
  async getLeadById(bookingId: string): Promise<any> {
    const booking = await BookingModel.findById(bookingId)
      .populate('customerId', 'fullName email phone')
      .populate('vehicleId', 'brand model registrationNumber fuelType')
      .populate('serviceId', 'name description basePrice')
      .populate('cityId', 'name state')
      .populate('assignedExecutiveId', 'fullName email')
      .lean();

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const assignment = await AssignmentModel.findOne({ bookingId })
      .populate('assignedExecutiveId', 'fullName email')
      .populate('assignedPartnerId', 'businessName isVerified')
      .lean();

    const bids = await BidModel.find({ bookingId })
      .populate({
        path: 'partnerId',
        select: 'businessName isVerified rating',
        populate: {
          path: 'userId',
          select: 'fullName email phone',
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    return {
      ...booking,
      assignment: assignment || null,
      bids,
    };
  }

  /**
   * Assign or nudge partners for a lead
   */
  async assignPartnerToLead(
    executiveId: string,
    bookingId: string,
    partnerIds?: string[],
    notes?: string
  ): Promise<any> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify booking is still PENDING or QUOTED (not already ACCEPTED, etc.)
    if (booking.status !== BOOKING_STATUS.PENDING && booking.status !== BOOKING_STATUS.QUOTED) {
      throw new BadRequestError('Booking is already accepted, completed, or cancelled');
    }

    if (partnerIds && partnerIds.length > 0) {
      const partners = await PartnerModel.find({ _id: { $in: partnerIds } });
      if (partners.length !== partnerIds.length) {
        throw new NotFoundError('One or more partners not found');
      }

      const checkDate = booking.preferredDate || new Date();
      checkDate.setHours(0, 0, 0, 0);
      const startOfDay = new Date(checkDate);
      const endOfDay = new Date(checkDate);
      endOfDay.setHours(23, 59, 59, 999);
      const { default: Job } = require('../../../partner/sub-modules/jobs/job.model');

      for (const partner of partners) {
        if (!partner.isVerified) {
          throw new BadRequestError(`Partner ${partner.businessName || partner._id} is not verified`);
        }

        // Check blocked dates
        const isBlocked = partner.blockedDates?.some((blockedDate: Date) => {
          const bd = new Date(blockedDate);
          bd.setHours(0, 0, 0, 0);
          return bd.getTime() === checkDate.getTime();
        });
  
        if (isBlocked) {
          throw new BadRequestError(`Partner ${partner.businessName} is blocked for date: ${checkDate.toDateString()}`);
        }
  
        // Check daily capacity
        const activeJobsCount = await Job.countDocuments({
          partnerId: partner._id,
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          status: { $in: ['NOT_STARTED', 'IN_PROGRESS'] }
        });
  
        if (activeJobsCount >= (partner.dailyCapacity || 5)) {
          throw new BadRequestError(`Partner ${partner.businessName} has reached maximum daily capacity for this date`);
        }
      }
    }

    const assignment = await AssignmentModel.findOneAndUpdate(
      { bookingId: new mongoose.Types.ObjectId(bookingId) },
      {
        assignedExecutiveId: executiveId,
        assignedPartnerIds: partnerIds && partnerIds.length > 0 ? partnerIds : undefined,
        assignmentType: ASSIGNMENT_TYPE.MANUALLY_ASSIGNED,
        notes,
      },
      { upsert: true, new: true }
    )
      .populate('assignedExecutiveId', 'fullName email')
      .populate('assignedPartnerIds', 'businessName isVerified');

    await BookingModel.findByIdAndUpdate(bookingId, {
      assignedExecutiveId: executiveId,
    });

    // Emit socket event to notify partners (simulate real-time alert)
    try {
      const { emitToRole } = require('../../../../sockets');
      emitToRole('PARTNER', 'new_lead', { bookingId }); // Since we do not have specific user socket tracking readily available in emitToUser, we broadcast to PARTNER role.
    } catch (err) {
      console.error('Failed to emit new_lead event', err);
    }

    return assignment;
  }

  /**
   * Forward a partner's quote to the customer
   */
  async forwardQuoteToCustomer(
    executiveId: string,
    bookingId: string,
    bidIds: string[],
    notes?: string
  ): Promise<any> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (!bidIds || bidIds.length === 0) {
      throw new BadRequestError('At least one bid ID is required');
    }

    const bids = await BidModel.find({ _id: { $in: bidIds } }).populate('partnerId');
    if (bids.length !== bidIds.length) {
      throw new NotFoundError('One or more bids not found');
    }

    const invalidBids = bids.filter(bid => bid.bookingId.toString() !== bookingId);
    if (invalidBids.length > 0) {
      throw new BadRequestError('One or more bids do not belong to this booking');
    }

    // Update booking
    booking.status = BOOKING_STATUS.QUOTED;
    booking.forwardedBidIds = bidIds.map(id => new mongoose.Types.ObjectId(id));
    await booking.save();

    // Notify Customer
    try {
      const { notificationService } = require('../../../notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');

      await notificationService.sendNotification(
        booking.customerId.toString(),
        NOTIFICATION_TYPE.SMS,
        NOTIFICATION_CATEGORY.BID_RECEIVED,
        'New Quotes Received',
        `You have received ${bidIds.length} new quote(s) for your service request.`,
        { bookingId: booking._id.toString() }
      );
    } catch (notifErr: any) {
      const { logger } = require('../../../../config/logger.config');
      logger.warn('Failed to send quote forwarded notification:', notifErr);
    }

    return booking;
  }
}

export const assignmentService = new AssignmentService();
