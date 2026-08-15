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
import { Types } from 'mongoose';
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
      serviceMode: (data as any).serviceMode || 'GARAGE_VISIT',
      paymentMode: (data as any).paymentMode || 'ONLINE',
      address: (data as any).address,
      landmark: (data as any).landmark,
      status: BOOKING_STATUS.PENDING,
    };

    if (data.latitude !== undefined && data.longitude !== undefined) {
      bookingData.location = {
        type: 'Point',
        coordinates: [data.longitude, data.latitude] // GeoJSON is [lng, lat]
      };
    }

    const booking = await BookingModel.create(bookingData);

    // Notify Admin and Executive about new booking/lead
    try {
      const { notificationService } = require('../../../../modules/notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../../modules/notification/notification.model');

      const payload = { bookingId: booking._id.toString() };
      emitToRole('SUPER_ADMIN', 'new_lead', payload);
      emitToRole('EXECUTIVE', 'new_lead', payload);

      const title = 'New Service Booking';
      const msg = `A new booking has been created for vehicle ID ${data.vehicleId}.`;

      await notificationService.sendToRole('SUPER_ADMIN', NOTIFICATION_TYPE.SYSTEM, NOTIFICATION_CATEGORY.LEAD_CREATED, title, msg, payload);
      await notificationService.sendToRole('EXECUTIVE', NOTIFICATION_TYPE.SYSTEM, NOTIFICATION_CATEGORY.LEAD_CREATED, title, msg, payload);
    } catch (err: any) {
      const { logger } = require('../../../../config/logger.config');
      logger.warn('Failed to send booking creation notification:', err);
    }

    return booking;
  }

  public static async getMyBookings(
    customerId: string,
    query: { status?: string; page?: string; limit?: string; search?: string }
  ): Promise<{ bookings: IBooking[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = { customerId };
    if (query.status && Object.values(BOOKING_STATUS).includes(query.status as BOOKING_STATUS)) {
      filter.status = query.status;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      const matchingServices = await ServiceModel.find({ name: searchRegex }).select('_id');
      const serviceIds = matchingServices.map(s => s._id);

      const matchingVehicles = await GarageModel.find({
        customerId,
        $or: [
          { brand: searchRegex },
          { model: searchRegex },
          { registrationNumber: searchRegex }
        ]
      }).select('_id');
      const vehicleIds = matchingVehicles.map(v => v._id);

      const searchConditions: any[] = [
        { status: searchRegex },
      ];

      if (serviceIds.length > 0) {
        searchConditions.push({ serviceId: { $in: serviceIds } });
      }

      if (vehicleIds.length > 0) {
        searchConditions.push({ vehicleId: { $in: vehicleIds } });
      }

      if (mongoose.Types.ObjectId.isValid(query.search)) {
        searchConditions.push({ _id: query.search });
      }

      filter.$or = searchConditions;
    }

    const [bookings, total] = await Promise.all([
      BookingModel.find(filter)
        .populate('vehicleId')
        .populate('serviceId')
        .populate('cityId')
        .populate('acceptedBidId')
        .populate('assignedExecutiveId', 'fullName email phone')
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

    // Only allow cancellation if not completed or already cancelled
    if (
      booking.status === BOOKING_STATUS.COMPLETED ||
      booking.status === BOOKING_STATUS.CANCELLED
    ) {
      throw new ApiError(
        400,
        `Cannot cancel booking in ${booking.status} status`,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    booking.status = BOOKING_STATUS.CANCELLED;
    booking.cancellationReason = reason;
    await booking.save();

    // Mark job as CANCELLED if it exists
    const job = await JobModel.findOne({ bookingId: booking._id });
    if (job) {
      job.status = 'CANCELLED';
      await job.save();
    }

    // Check for successful payment to auto-initiate refund
    const PaymentModel = mongoose.model('Payment');
    const successfulPayments = await PaymentModel.find({
      bookingId: booking._id,
      status: 'SUCCESS'
    });

    if (successfulPayments && successfulPayments.length > 0) {
      const RefundModel = mongoose.model('Refund');
      for (const payment of successfulPayments) {
        await RefundModel.create({
          paymentId: payment._id,
          bookingId: booking._id,
          customerId: booking.customerId,
          amount: payment.amount,
          reason: reason || 'Customer cancelled booking',
          status: 'REQUESTED'
        });
      }
    }

    return booking;
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
    await require('../../../notification/notification.service').notificationService.sendToRole(
      'SUPER_ADMIN',
      require('../../../notification/notification.model').NOTIFICATION_TYPE.IN_APP,
      require('../../../notification/notification.model').NOTIFICATION_CATEGORY.BOOKING_UPDATE,
      'Booking Confirmed',
      `Booking ${booking._id.toString().slice(-8).toUpperCase()} has been confirmed.`,
      eventPayload
    );

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
        emitToUser(partner.userId.toString(), 'job_updated', { jobId: job._id.toString() });
        const notifService = require('../../../notification/notification.service').notificationService;
        const notifModel = require('../../../notification/notification.model');
        const notifPayload = { bookingId: booking._id.toString() };

        await notifService.sendToRole(
          'SUPER_ADMIN',
          notifModel.NOTIFICATION_TYPE.IN_APP,
          notifModel.NOTIFICATION_CATEGORY.BOOKING_UPDATE,
          'Booking Updated',
          `Booking ${booking._id.toString().slice(-8).toUpperCase()} has been updated.`,
          notifPayload
        );

        await notifService.sendToRole(
          'ACCOUNTS',
          notifModel.NOTIFICATION_TYPE.IN_APP,
          notifModel.NOTIFICATION_CATEGORY.BOOKING_UPDATE,
          'Booking Updated',
          `Booking ${booking._id.toString().slice(-8).toUpperCase()} has been updated.`,
          notifPayload
        );
      }
    } catch (e) {
      console.error('Failed to notify after booking update', e);
    }

    return job;
  }

  public static async applyCoupon(customerId: string, bookingId: string, couponCode: string): Promise<IBooking> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) throw new NotFoundError('Booking not found');
    if (booking.customerId.toString() !== customerId) {
      throw new UnauthorizedError('Not authorized');
    }

    if (booking.status === BOOKING_STATUS.COMPLETED || booking.status === BOOKING_STATUS.CANCELLED) {
      throw new ApiError(400, 'Cannot apply coupon to a completed or cancelled booking', ERROR_CODES.VALIDATION_ERROR);
    }

    const { CouponService } = require('../../../super-admin/sub-modules/coupons/coupons.service');
    const coupon = await CouponService.validate(couponCode);
    if (!coupon) {
      throw new ApiError(400, "Invalid or expired coupon code", ERROR_CODES.VALIDATION_ERROR);
    }
    if (coupon.currentUses >= coupon.maxUses) {
      throw new ApiError(400, "Coupon usage limit reached", ERROR_CODES.VALIDATION_ERROR);
    }

    let baseAmount = 0;
    if (booking.acceptedBidId) {
      const bid = await BidModel.findById(booking.acceptedBidId);
      if (bid) {
        baseAmount = bid.quotedAmount;
      }
    }

    const job = await JobModel.findOne({ bookingId: booking._id });
    if (job && job.finalAmount) {
      baseAmount = job.finalAmount;
    }

    let approvedExtensionsCost = 0;
    if (job && job.jobExtensions && job.jobExtensions.length > 0) {
      const approvedExts = job.jobExtensions.filter((e: any) => e.status === 'APPROVED');
      approvedExtensionsCost = approvedExts.reduce((sum: number, ext: any) => sum + ext.cost, 0);
    }

    const totalAmount = baseAmount + approvedExtensionsCost;
    if (totalAmount <= 0) {
      throw new ApiError(400, 'Total booking amount is zero, cannot apply coupon', ERROR_CODES.VALIDATION_ERROR);
    }

    let discountAmount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = totalAmount * (coupon.discountValue / 100);
    } else {
      discountAmount = coupon.discountValue;
    }

    if (discountAmount > totalAmount) discountAmount = totalAmount;

    booking.appliedCoupon = couponCode;
    booking.couponDiscountAmount = discountAmount;
    await booking.save();

    return booking;
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

  /**
   * Executive triggers Satisfaction Form template to Customer
   */
  public static async sendSatisfactionTemplate(bookingId: string): Promise<IBooking> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    booking.satisfactionStatus = 'PENDING_CUSTOMER';
    booking.satisfactionSentAt = new Date();
    await booking.save();

    // Trigger Socket event to Customer + In-App Notification
    try {
      const { emitToUser } = require('../../../../sockets');
      const { notificationService } = require('../../../notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');

      const payload = {
        bookingId: booking._id.toString(),
        title: 'Service Satisfaction Feedback Request',
        message: 'Please take a moment to confirm if you are satisfied with your car service experience.'
      };

      emitToUser(booking.customerId.toString(), 'satisfaction_request', payload);

      await notificationService.sendNotification(
        booking.customerId.toString(),
        NOTIFICATION_TYPE.SMS,
        NOTIFICATION_CATEGORY.JOB_STATUS,
        payload.title,
        payload.message,
        payload
      );
    } catch (err: any) {
      const { logger } = require('../../../../config/logger.config');
      logger.warn('Failed to send satisfaction request:', err);
    }

    return booking;
  }

  /**
   * Customer submits response for Satisfaction Form
   */
  public static async respondSatisfactionTemplate(
    customerId: string,
    bookingId: string,
    data: { isSatisfied: boolean; rating?: number; feedback?: string }
  ): Promise<IBooking> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You are not authorized to review this booking');
    }

    booking.satisfactionStatus = data.isSatisfied ? 'SATISFIED' : 'DISSATISFIED';
    if (data.rating) booking.satisfactionRating = data.rating;
    if (data.feedback) booking.satisfactionFeedback = data.feedback;
    booking.satisfactionRespondedAt = new Date();
    await booking.save();

    // Notify Executive & Super Admin with real-time socket alert
    try {
      const { emitToRole } = require('../../../../sockets');
      const { UserModel } = require('../../../user/user.model');
      const customer = await UserModel.findById(customerId);
      const customerName = customer ? customer.fullName || 'Customer' : 'Customer';

      const payload = {
        bookingId: booking._id.toString(),
        customerId,
        customerName,
        isSatisfied: data.isSatisfied,
        rating: data.rating || 5,
        feedback: data.feedback || '',
        title: data.isSatisfied ? '💚 Customer Confirmed Satisfaction!' : '🔴 Customer Reported Dissatisfaction!',
        message: `${customerName} responded to service satisfaction form for Booking #${booking._id.toString().slice(-6)}.`
      };

      emitToRole('EXECUTIVE', 'satisfaction_response', payload);
      emitToRole('SUPER_ADMIN', 'satisfaction_response', payload);

      const { notificationService } = require('../../../notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');

      await notificationService.sendToRole(
        'EXECUTIVE',
        NOTIFICATION_TYPE.SYSTEM,
        NOTIFICATION_CATEGORY.JOB_STATUS,
        payload.title,
        payload.message,
        payload
      );
    } catch (err: any) {
      const { logger } = require('../../../../config/logger.config');
      logger.warn('Failed to dispatch satisfaction response notification:', err);
    }

    return booking;
  }
}
export default BookingService;
