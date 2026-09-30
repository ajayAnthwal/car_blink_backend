import { PaymentModel } from '../../../payment/payment.model';
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
    if (vehicle.customerId) {
      if (vehicle.customerId.toString() !== customerId) {
        throw new UnauthorizedError('You do not own this vehicle');
      }
    } else {
      vehicle.customerId = customerId as any;
      await vehicle.save();
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
      verificationCode: Math.floor(1000 + Math.random() * 9000).toString(),
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

      const { UserModel } = require('../../../user/user.model');
      const custUser = await UserModel.findById(customerId).lean();

      const payload = {
        bookingId: booking._id.toString(),
        name: custUser?.fullName || 'Customer',
        phone: custUser?.phone || '',
        source: 'Platform Booking',
        message: data.description || 'New service booking requested',
      };
      emitToRole('SUPER_ADMIN', 'new_lead', payload);
      emitToRole('EXECUTIVE', 'new_lead', payload);

      const title = 'New Service Booking';
      const msg = `A new booking #${booking._id.toString().slice(-8).toUpperCase()} created by ${custUser?.fullName || 'Customer'} (${custUser?.phone || ''}).`;

      await notificationService.sendToRole('SUPER_ADMIN', NOTIFICATION_TYPE.IN_APP, NOTIFICATION_CATEGORY.LEAD_CREATED, title, msg, payload);
      await notificationService.sendToRole('EXECUTIVE', NOTIFICATION_TYPE.IN_APP, NOTIFICATION_CATEGORY.LEAD_CREATED, title, msg, payload);
    } catch (err: any) {
      const { logger } = require('../../../../config/logger.config');
      logger.warn('Failed to send booking creation notification:', err);
    }

    return booking;
  }

  public static async getMyBookings(
    customerId: string,
    query: { status?: string; page?: string; limit?: string; search?: string }
  ): Promise<{ bookings: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const { UserModel } = require('../../../user/user.model');
    const user = await UserModel.findById(customerId);
    const userPhone = user?.phone ? user.phone.trim() : null;

    if (userPhone) {
      try {
        await BookingModel.updateMany({ customerId: { $exists: false }, phone: userPhone }, { customerId });
      } catch (err) {
        // silent sync
      }
    }

    const custIdObj = mongoose.Types.ObjectId.isValid(customerId) ? new mongoose.Types.ObjectId(customerId) : customerId;
    const cleanUserPhone = userPhone ? userPhone.replace(/[^0-9]/g, '').slice(-10) : '';

    const userFilter: any = {
      $or: [
        { customerId: custIdObj },
        { customerId: customerId.toString() },
        ...(cleanUserPhone ? [
          { phone: cleanUserPhone },
          { phone: `+91${cleanUserPhone}` },
          { phone: `91${cleanUserPhone}` }
        ] : [])
      ]
    };
    const filter: any = {};
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

      filter.$and = [
        userFilter,
        { $or: searchConditions }
      ];
    } else {
      Object.assign(filter, userFilter);
    }

    require('../../../master-data/models/city.model');
    require('../../../master-data/models/service.model');
    require('../garage/garage.model');
    require('../../../partner/sub-modules/bidding/bid.model');
    require('../../../partner/partner.model');
    require('../../../user/user.model');

    const [bookingsRaw, total] = await Promise.all([
      BookingModel.find(filter)
        .populate('vehicleId')
        .populate('serviceId')
        .populate('cityId')
        .populate({
          path: 'assignedPartnerId',
          model: 'Partner',
          populate: { path: 'userId', select: 'fullName email phone profileImage' }
        })
        .populate({
          path: 'acceptedBidId',
          model: 'Bid',
          populate: {
            path: 'partnerId',
            model: 'Partner',
            populate: { path: 'userId', select: 'fullName email phone profileImage' }
          }
        })
        .populate('assignedExecutiveId', 'fullName email phone')
        .setOptions({ strictPopulate: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BookingModel.countDocuments(filter),
    ]);

    const bookingIds = bookingsRaw.map(b => b._id);
    const bookingIdStrs = bookingsRaw.map(b => String(b._id));
    const objectIds = bookingIdStrs.map(id => new mongoose.Types.ObjectId(id));

    const jobs = await JobModel.find({
      $or: [
        { bookingId: { $in: objectIds } },
        { bookingId: { $in: bookingIdStrs } }
      ]
    }).lean();

    const jobsMap = new Map();
    jobs.forEach(j => {
      if (j.bookingId) {
        const key = String((j.bookingId as any)._id || j.bookingId);
        jobsMap.set(key, j);
      }
    });

    // PaymentModel imported at top
    const allPayments = await PaymentModel.find({
      $or: [
        { bookingId: { $in: objectIds } },
        { bookingId: { $in: bookingIdStrs } }
      ]
    }).lean();

    const paymentsMap = new Map();
    allPayments.forEach((p: any) => {
      const key = String(p.bookingId);
      if (!paymentsMap.has(key)) paymentsMap.set(key, []);
      paymentsMap.get(key).push(p);
    });

    const bookings = bookingsRaw.map(b => {
      const bKey = String(b._id);
      const jDetails = jobsMap.get(bKey) || null;
      const bPayments = paymentsMap.get(bKey) || [];
      const hasPaidAdvance = (b as any).hasPaidAdvance || bPayments.some((p: any) => p.status === 'SUCCESS' && p.amount > 0);
      const isUnlocked = hasPaidAdvance || (b.status !== 'PENDING' && b.status !== 'QUOTED' && b.status !== 'CANCELLED');
      return {
        ...b,
        verificationCode: isUnlocked ? b.verificationCode : null,
        jobDetails: jDetails,
        jobExtensions: jDetails?.jobExtensions || [],
        additionalParts: jDetails?.jobExtensions || [],
        payments: bPayments
      };
    });

    console.log(`[BACKEND getMyBookings] customerId: ${customerId}, found ${bookingsRaw.length} bookings, ${jobs.length} matching jobs.`);

    return { bookings, total, page, limit };
  }

  public static async getBookingById(customerId: string, bookingId: string): Promise<any> {
    require('../../../master-data/models/city.model');
    require('../../../master-data/models/service.model');
    require('../garage/garage.model');
    require('../../../partner/sub-modules/bidding/bid.model');
    require('../../../partner/partner.model');
    require('../../../user/user.model');

    const booking = await BookingModel.findById(bookingId)
      .populate('customerId', 'fullName email phone')
      .populate('vehicleId')
      .populate('serviceId')
      .populate({ path: 'cityId', model: 'City' })
      .populate('acceptedBidId')
      .setOptions({ strictPopulate: false })
      .lean();

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (!booking.verificationCode) {
      const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
      await BookingModel.findByIdAndUpdate(bookingId, { verificationCode: generatedCode });
      (booking as any).verificationCode = generatedCode;
    }

    if (!(await BookingService.verifyBookingCustomerAccess(booking, customerId))) {
      throw new UnauthorizedError('You are not authorized to view this booking');
    }

    // Fetch associated job details (which includes photos and extensions)
    const jobDetails = await JobModel.findOne({ bookingId }).lean();

    // Fetch payments
    // PaymentModel imported at top
    const payments = await PaymentModel.find({ bookingId }).lean();

    const hasPaid15PercentAdvance = (booking as any).hasPaidAdvance || (payments && payments.some((p) => p.status === 'SUCCESS' && p.amount > 0));
    const isUnlocked = hasPaid15PercentAdvance;

    let rawPartner: any = (booking as any).assignedPartnerId || (booking.acceptedBidId as any)?.partnerId || null;

    if (!rawPartner) {
      try {
        const acceptedBid = await BidModel.findOne({
          bookingId: booking._id,
          status: { $in: ['ACCEPTED', 'CUSTOMER_ACCEPTED', 'CONFIRMED'] }
        })
        .populate({
          path: 'partnerId',
          model: 'Partner',
          populate: { path: 'userId', select: 'fullName email phone profileImage' }
        })
        .lean();

        if (acceptedBid && (acceptedBid as any).partnerId) {
          rawPartner = (acceptedBid as any).partnerId;
        }
      } catch (bidErr) {}
    }

    if (rawPartner) {
      if (typeof rawPartner === 'string' || rawPartner instanceof mongoose.Types.ObjectId) {
        try {
          const { PartnerModel } = require('../../../partner/partner.model');
          rawPartner = await PartnerModel.findById(rawPartner).populate('userId', 'fullName email phone profileImage').lean();
        } catch (pErr) {}
      }

      if (!isUnlocked) {
        rawPartner = {
          _id: rawPartner._id,
          businessName: 'Verified CarBlink Workshop',
          businessAddress: 'Unlocked after 15% advance payment',
          phone: '+91 XXXXX XXXXX',
          rating: rawPartner?.rating || 4.8,
          userId: {
            fullName: 'CarBlink Certified Partner',
            email: 'unlocked_after_payment@carblink.in',
            phone: '+91 XXXXX XXXXX'
          }
        };
      } else {
        const userObj = rawPartner?.userId && typeof rawPartner.userId === 'object' ? rawPartner.userId : null;
        rawPartner = {
          ...rawPartner,
          businessName: rawPartner?.businessName || userObj?.fullName || 'Verified Service Partner',
          businessAddress: rawPartner?.businessAddress || 'Verified Partner Address',
          phone: rawPartner?.phone || userObj?.phone || '',
          email: rawPartner?.email || userObj?.email || '',
          userId: userObj || {
            fullName: rawPartner?.businessName || 'Verified Service Partner',
            phone: rawPartner?.phone || '',
            email: rawPartner?.email || ''
          }
        };
      }
    }

    let assignedPartner = rawPartner;

    return {
      ...booking,
      assignedPartnerId: assignedPartner,
      verificationCode: isUnlocked ? booking.verificationCode : null,
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

    if (!(await BookingService.verifyBookingCustomerAccess(booking, customerId))) {
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
    // PaymentModel imported at top
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
    if (!(await BookingService.verifyBookingCustomerAccess(booking, customerId))) {
      throw new UnauthorizedError('You are not authorized to view quotes for this booking');
    }

    require('../../../partner/sub-modules/bidding/bid.model');
    require('../../../partner/partner.model');
    require('../../../user/user.model');

    // 2. Fetch bids for this booking (either via forwardedBidIds or directly by bookingId)
    let bidQuery: any = { status: { $ne: 'WITHDRAWN' } };
    if (booking.forwardedBidIds && booking.forwardedBidIds.length > 0) {
      bidQuery.$or = [
        { _id: { $in: booking.forwardedBidIds } },
        { bookingId: booking._id },
        { bookingId: booking._id.toString() }
      ];
    } else {
      bidQuery.$or = [
        { bookingId: booking._id },
        { bookingId: booking._id.toString() }
      ];
    }

    const bids = await BidModel.find(bidQuery)
      .populate({
        path: 'partnerId',
        populate: { path: 'userId', select: 'fullName email phone' }
      })
      .setOptions({ strictPopulate: false })
      .lean();

    // MASKING PRIVACY: Mask partner name & contact details if customer has not accepted/paid for booking yet
    const isPaidOrAccepted = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status);

    const processedBids = bids.map((bid: any) => {
      if (isPaidOrAccepted || !bid.partnerId) {
        return bid;
      }

      const p = bid.partnerId;
      const rawName = p.businessName || p.userId?.fullName || 'Partner Garage';
      const nameParts = rawName.split(' ');
      const maskedName = nameParts.length > 1
        ? `${nameParts[0]} ***** (Verified Partner)`
        : `${rawName.substring(0, 3)}***** (Verified Partner)`;

      return {
        ...bid,
        partnerId: {
          ...p,
          businessName: maskedName,
          businessAddress: p.businessAddress ? `${p.cityId || 'Verified Location'} (Address details unlocked after booking)` : 'Verified Location',
          userId: {
            fullName: 'CarBlink Certified Partner',
            email: 'unlocked_after_payment@carblink.in',
            phone: '+91 XXXXX XXXXX',
          }
        }
      };
    });

    return processedBids;
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
    if (!(await BookingService.verifyBookingCustomerAccess(booking, customerId))) {
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

    // 3. Mark booking as CUSTOMER_ACCEPTED and store acceptedBidId (Pending Executive confirmation)
    booking.status = BOOKING_STATUS.CUSTOMER_ACCEPTED;
    booking.acceptedBidId = selectedBid._id;
    (booking as any).assignedPartnerId = selectedBid.partnerId?._id || selectedBid.partnerId;
    await booking.save();

    // 4. Emit live socket events & Notifications to Executive & Super Admin ONLY
    const executiveUserId = booking.assignedExecutiveId?.toString();
    const eventPayload = {
      bookingId: booking._id,
      bidId: selectedBid._id,
      quotedAmount: selectedBid.quotedAmount,
      status: BOOKING_STATUS.CUSTOMER_ACCEPTED,
      message: 'Customer accepted quote. Executive confirmation required.'
    };

    if (executiveUserId) {
      emitToUser(executiveUserId, 'customer_accepted_quote', eventPayload);
    }

    try {
      const { notificationService } = require('../../../notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');

      await notificationService.sendToRole(
        'SUPER_ADMIN',
        NOTIFICATION_TYPE.IN_APP,
        NOTIFICATION_CATEGORY.BOOKING_UPDATE,
        'Customer Accepted Quote - Action Required',
        `Customer accepted quote of INR ${selectedBid.quotedAmount} for Booking #${booking._id.toString().slice(-8).toUpperCase()}. Executive confirmation required.`,
        eventPayload
      );

      await notificationService.sendToRole(
        'EXECUTIVE',
        NOTIFICATION_TYPE.IN_APP,
        NOTIFICATION_CATEGORY.BOOKING_UPDATE,
        'Customer Accepted Quote - Action Required',
        `Customer accepted quote of INR ${selectedBid.quotedAmount} for Booking #${booking._id.toString().slice(-8).toUpperCase()}. Executive confirmation required.`,
        eventPayload
      );

      await notificationService.sendNotification(
        booking.customerId.toString(),
        NOTIFICATION_TYPE.IN_APP,
        NOTIFICATION_CATEGORY.QUOTE_ACCEPTED,
        'Quote Selection Received',
        `You have selected the quote of ₹${selectedBid.quotedAmount} for booking #${booking._id.toString().slice(-8).toUpperCase()}. Please confirm booking with 15% advance to unlock partner address and Handover PIN.`,
        { bookingId: booking._id.toString() }
      );

      // WhatsApp to Customer requesting 15% Advance / Confirmation
      try {
        const { whatsappProvider } = require('../../../notification/providers/whatsapp.provider');
        const UserModel = mongoose.model('User');
        const customerUser = await UserModel.findById(booking.customerId);
        if (customerUser && customerUser.phone) {
          const advanceAmt = Math.round(Number(selectedBid.quotedAmount) * 0.15);
          const bookingRef = booking._id.toString().slice(-8).toUpperCase();
          const waMsg = '🚘 *[CARBLINK - QUOTE ACCEPTED]*\n\n' +
            'Hello *' + (customerUser.fullName || 'Customer') + '*! 👋\n\n' +
            'You have successfully selected the quote of *₹' + selectedBid.quotedAmount.toLocaleString() + '* for booking #' + bookingRef + '.\n\n' +
            '💳 *Next Step (Advance Confirmation):*\nPlease confirm your booking by paying the 15% advance token (*₹' + advanceAmt.toLocaleString() + '*) or select Pay at Workshop (Cash).\n\n' +
            '🔒 *Security Note:* Your 4-digit Workshop Handover PIN & workshop address will unlock immediately upon confirmation.\n\n' +
            '👉 *Confirm Booking & Pay Advance:*\nhttps://dashboard.carblink.in/customer/bookings/' + booking._id + '\n\n' +
            'Thank you for choosing CarBlink!';

          await whatsappProvider.sendWhatsAppText(customerUser.phone, waMsg).catch((err: any) => {
            console.warn('Failed to send quote selection WhatsApp:', err?.message || err);
          });
        }
      } catch (waCustErr: any) {
        console.warn('Failed to dispatch customer quote selection WhatsApp:', waCustErr?.message || waCustErr);
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
    if (!(await BookingService.verifyBookingCustomerAccess(booking, customerId))) {
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
    if (!(await BookingService.verifyBookingCustomerAccess(booking, customerId))) {
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
    if (!(await BookingService.verifyBookingCustomerAccess(booking, customerId))) {
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

    if (booking.status !== BOOKING_STATUS.COMPLETED) {
      throw new ApiError(
        400,
        'Satisfaction feedback form can only be sent after the service job is completed.',
        ERROR_CODES.VALIDATION_ERROR
      );
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

    if (!(await BookingService.verifyBookingCustomerAccess(booking, customerId))) {
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
        NOTIFICATION_TYPE.IN_APP,
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

  public static async verifyBookingCustomerAccess(booking: any, customerId: string): Promise<boolean> {
    if (!booking) return false;
    const bCustId = booking.customerId ? booking.customerId.toString() : '';
    if (bCustId === customerId) return true;

    try {
      const { UserModel } = require('../../../user/user.model');
      const user = await UserModel.findById(customerId).lean();
      if (!user) return false;

      if (user.role === 'SUPER_ADMIN' || user.role === 'EXECUTIVE') return true;

      const userPhone = user.phone ? user.phone.trim() : null;
      if (userPhone) {
        const bPhone = (booking.phone || booking.customerPhone || '').trim();
        if (bPhone && bPhone === userPhone) {
          // Auto link customerId for future queries
          BookingModel.updateOne({ _id: booking._id || booking.id }, { $set: { customerId } }).exec();
          return true;
        }
      }
    } catch (err) {
      console.error("Error in verifyBookingCustomerAccess:", err);
    }

    return false;
  }

  public static async updatePaymentMode(customerId: string, bookingId: string, paymentMode: 'CASH' | 'ONLINE') {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }
    const hasAccess = await this.verifyBookingCustomerAccess(booking, customerId);
    if (!hasAccess && booking.customerId?.toString() !== customerId) {
      throw new UnauthorizedError('Unauthorized to update this booking');
    }
    booking.paymentMode = paymentMode;
    await booking.save();
    return booking;
  }

}