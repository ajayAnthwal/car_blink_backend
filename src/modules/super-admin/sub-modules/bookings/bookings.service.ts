import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';
import { UserModel } from '../../../user/user.model';
import { PartnerModel } from '../../../partner/partner.model';
import { ServiceModel } from '../../../master-data/models/service.model';
import { GarageModel } from '../../../customer/sub-modules/garage/garage.model';
import { CityModel } from '../../../master-data/models/city.model';
import { BidModel } from '../../../partner/sub-modules/bidding/bid.model';
import { JobModel } from '../../../partner/sub-modules/jobs/job.model';
import { PaymentModel } from '../../../payment/payment.model';
import AuditLogModel from '../audit-logs/audit-log.model';
import { BOOKING_STATUS } from '../../../../common/constants/status.constant';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { BadRequestError } from '../../../../common/errors/BadRequestError';
import mongoose, { Types } from 'mongoose';

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

    if (search) {
      if (Types.ObjectId.isValid(search)) {
        filter._id = search;
      }
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
      .populate({
        path: 'acceptedBidId',
        select: 'quotedAmount originalQuotedAmount executiveQuoteAmount executiveDiscount isModifiedByExecutive version status partnerId modifiedByUserId',
        populate: [
          { path: 'partnerId', select: 'businessName uniquePartnerId' },
          { path: 'modifiedByUserId', select: 'fullName email' }
        ]
      })
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
    // Ensure all Mongoose schemas are registered before populate queries
    if (!UserModel || !PartnerModel || !ServiceModel || !GarageModel || !CityModel || !BidModel) {
      console.log('Models loaded');
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(bookingId);
    let booking: any = null;

    if (isObjectId) {
      booking = await BookingModel.findOne({
        $or: [{ _id: bookingId }, { leadId: bookingId }]
      })
        .populate('customerId', 'fullName email phone')
        .populate('vehicleId', 'make model year registrationNumber')
        .populate('serviceId', 'name basePrice category')
        .populate('cityId', 'name state')
        .populate('assignedExecutiveId', 'fullName phone email')
        .populate('assignedPartnerId', 'businessName uniquePartnerId userId contactNumber phone')
        .populate({
          path: 'acceptedBidId',
          populate: [
            {
              path: 'partnerId',
              select: 'businessName uniquePartnerId userId contactNumber',
              populate: { path: 'userId', select: 'fullName email phone' }
            },
            {
              path: 'modifiedByUserId',
              select: 'fullName email role phone'
            }
          ]
        })
        .lean();
    }

    if (!booking && isObjectId) {
      const LeadModel = mongoose.model('Lead');
      const lead: any = await LeadModel.findById(bookingId).lean().catch(() => null);
      if (lead && lead.bookingId) {
        booking = await BookingModel.findById(lead.bookingId)
          .populate('customerId', 'fullName email phone')
          .populate('vehicleId', 'make model year registrationNumber')
          .populate('serviceId', 'name basePrice category')
          .populate('cityId', 'name state')
          .populate('assignedExecutiveId', 'fullName phone email')
          .populate('assignedPartnerId', 'businessName uniquePartnerId userId contactNumber phone')
          .populate({
            path: 'acceptedBidId',
            populate: [
              {
                path: 'partnerId',
                select: 'businessName uniquePartnerId userId contactNumber',
                populate: { path: 'userId', select: 'fullName email phone' }
              },
              {
                path: 'modifiedByUserId',
                select: 'fullName email role phone'
              }
            ]
          })
          .lean();
      }
    }

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const { InvoiceModel } = require('../../../partner/sub-modules/jobs/invoice.model');
    const { JobModel } = require('../../../partner/sub-modules/jobs/job.model');
    const { PaymentModel } = require('../../../payment/payment.model');
    const { SettlementModel } = require('../../../accounts/sub-modules/settlements/settlement.model');

    const [invoice, job, payment, bids] = await Promise.all([
      InvoiceModel.findOne({ $or: [{ bookingId: booking._id }, { jobId: booking.jobId }] }).lean().catch(() => null),
      JobModel.findOne({ bookingId: booking._id }).lean().catch(() => null),
      PaymentModel.findOne({ bookingId: booking._id }).lean().catch(() => null),
      BidModel.find({ bookingId: booking._id })
        .populate({
          path: 'partnerId',
          select: 'businessName uniquePartnerId userId contactNumber',
          populate: { path: 'userId', select: 'fullName email phone' }
        })
        .populate({
          path: 'modifiedByUserId',
          select: 'fullName email role phone'
        })
        .sort({ createdAt: -1 })
        .lean()
        .catch(() => [])
    ]);

    let settlement = null;
    if (job?._id) {
      settlement = await SettlementModel.findOne({ jobId: job._id }).lean().catch(() => null);
    }

    return {
      ...booking,
      invoice,
      job,
      payment,
      bids,
      settlement
    };
  }

  /**
   * Force cancel a booking as super admin with audit log
   */
  async cancelBooking(adminUserId: string, adminRole: string, bookingId: string, reason: string) {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    booking.status = BOOKING_STATUS.CANCELLED;
    booking.cancellationReason = `Super Admin: ${reason || 'Cancelled by administration'}`;
    await booking.save();

    // Notify customer via DLT Cancellation SMS (Template 1561221)
    try {
      const { UserModel } = require('../../../user/user.model');
      const custUser = await UserModel.findById(booking.customerId);
      if (custUser && custUser.phone) {
        const { smsProvider } = require('../../../notification/providers/sms.provider');
        smsProvider.sendBookingCancelled(custUser.phone, booking._id.toString()).catch(() => {});
      }
    } catch (smsErr) {
      console.warn('Failed to send cancellation SMS to customer:', smsErr);
    }

    try {
      const AuditLog = require('../audit-logs/audit-log.model').default;
      await AuditLog.create({
        userId: adminUserId,
        userRole: adminRole || 'SUPER_ADMIN',
        action: 'SUPER_ADMIN_CANCEL_BOOKING',
        endpoint: `/api/super-admin/bookings/${bookingId}/cancel`,
        method: 'PUT',
        payload: {
          bookingId,
          reason: reason || 'Cancelled by administration',
        },
        status: 'SUCCESS',
      });
    } catch (auditErr) {
      console.error('Audit Log Error:', auditErr);
    }

    return booking;
  }

  /**
   * Super Admin Manual Booking / Workflow Bypass & Assignment
   */
  async manualAssignAndBypass(
    adminUserId: string,
    adminRole: string,
    bookingId: string,
    data: {
      partnerId?: string;
      executiveId?: string;
      status?: string;
      quotedAmount?: number;
      overridePayment?: boolean;
      reason: string;
    },
    clientIp?: string
  ) {
    const { partnerId, executiveId, status, quotedAmount, overridePayment, reason } = data;

    const session = await mongoose.startSession();
    session.startTransaction();

    let resolvedPartnerDoc: any = null;
    const updatesPerformed: string[] = [];

    try {
      const booking = await BookingModel.findById(bookingId).session(session);
      if (!booking) {
        throw new NotFoundError('Booking not found');
      }

      const prevStatus = booking.status;
      const previousValues = {
        status: booking.status,
        assignedPartnerId: booking.assignedPartnerId,
        assignedExecutiveId: booking.assignedExecutiveId,
        acceptedQuoteAmount: booking.acceptedQuoteAmount,
        finalAmount: booking.finalAmount,
        pricing: booking.pricing ? JSON.parse(JSON.stringify(booking.pricing)) : undefined,
        hasPaidAdvance: booking.hasPaidAdvance,
        isAdvancePaid: (booking as any).isAdvancePaid,
        paymentStatus: (booking as any).paymentStatus,
        verificationCode: (booking as any).verificationCode,
      };

      // 1. Validate & Assign Partner
      if (partnerId && partnerId.trim() !== '') {
        if (!mongoose.Types.ObjectId.isValid(partnerId)) {
          throw new BadRequestError(`Invalid Partner ID format: '${partnerId}'`);
        }

        resolvedPartnerDoc = await PartnerModel.findById(partnerId).session(session);
        if (!resolvedPartnerDoc) {
          resolvedPartnerDoc = await PartnerModel.findOne({ userId: partnerId }).session(session);
        }

        if (!resolvedPartnerDoc) {
          throw new BadRequestError(`Partner not found with ID '${partnerId}'`);
        }

        booking.assignedPartnerId = resolvedPartnerDoc._id;
        updatesPerformed.push(`Partner assigned: ${resolvedPartnerDoc.businessName || resolvedPartnerDoc._id}`);
      }

      // 2. Validate & Assign Executive
      if (executiveId && executiveId.trim() !== '') {
        if (!mongoose.Types.ObjectId.isValid(executiveId)) {
          throw new BadRequestError(`Invalid Executive ID format: '${executiveId}'`);
        }

        const execUser = await UserModel.findById(executiveId).session(session);
        if (!execUser) {
          throw new BadRequestError(`Executive user not found with ID '${executiveId}'`);
        }

        if (execUser.role !== 'EXECUTIVE' && execUser.role !== 'ADMIN' && execUser.role !== 'SUPER_ADMIN') {
          throw new BadRequestError(`User '${execUser.fullName || executiveId}' does not have EXECUTIVE role`);
        }

        booking.assignedExecutiveId = execUser._id;
        updatesPerformed.push(`Executive assigned: ${execUser.fullName || execUser.phone} (${execUser._id})`);
      }

      // 3. Force Status
      if (status && status.trim() !== '') {
        booking.status = status as any;
        updatesPerformed.push(`Status changed from ${prevStatus} to ${status}`);
      }

      // 4. Custom Quote Price
      if (quotedAmount !== undefined && quotedAmount !== null && !isNaN(Number(quotedAmount))) {
        const numAmt = Number(quotedAmount);
        if (numAmt <= 0) {
          throw new BadRequestError('Custom quote price must be greater than 0');
        }
        booking.acceptedQuoteAmount = numAmt;
        booking.finalAmount = numAmt;
        if (!booking.pricing) {
          (booking as any).pricing = {};
        }
        (booking.pricing as any).partnerBaseQuote = numAmt;
        (booking.pricing as any).customerGrossQuote = numAmt;
        (booking.pricing as any).advanceRequired = Math.round(numAmt * 0.15);
        updatesPerformed.push(`Custom quote price set to ₹${numAmt}`);
      }

      // 5. Bypass Payment Gateway (Idempotent)
      if (overridePayment) {
        booking.hasPaidAdvance = true;
        (booking as any).isAdvancePaid = true;
        (booking as any).paymentStatus = 'PARTIALLY_PAID';

        if (!booking.verificationCode) {
          booking.verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
        }

        const existingSuccessPayment = await PaymentModel.findOne({
          bookingId: booking._id,
          $or: [{ status: 'SUCCESS' }, { paymentType: 'ADVANCE' }],
        }).session(session);

        if (!existingSuccessPayment) {
          const resolvedAmount =
            quotedAmount ||
            booking.finalAmount ||
            booking.acceptedQuoteAmount ||
            (booking as any).estimatedAmount ||
            0;
          const advanceAmt = Math.round(resolvedAmount * 0.15);
          const balanceAmt = resolvedAmount - advanceAmt;
          const bypassPaymentId = new mongoose.Types.ObjectId();

          await PaymentModel.create(
            [
              {
                _id: bypassPaymentId,
                bookingId: booking._id,
                customerId: booking.customerId,
                amount: advanceAmt > 0 ? advanceAmt : resolvedAmount,
                currency: 'INR',
                paymentType: 'ADVANCE',
                status: 'SUCCESS',
                provider: 'SUPER_ADMIN_BYPASS',
                providerOrderId: `BYPASS_${bypassPaymentId.toString()}`,
                providerPaymentId: `PAY_BYPASS_${Date.now()}`,
                paidAt: new Date(),
                meta: {
                  totalBookingAmount: resolvedAmount,
                  advanceAmount: advanceAmt,
                  balanceAmount: balanceAmt,
                  overrideBy: adminUserId,
                  reason: reason || 'Manual workflow override by Super Admin',
                },
              },
            ],
            { session }
          );
          updatesPerformed.push(`Payment requirement bypassed: advance ₹${advanceAmt} marked as PAID`);
        } else {
          updatesPerformed.push(
            `Payment requirement confirmed (existing payment #${existingSuccessPayment._id} preserved)`
          );
        }
      }

      // 6. Ensure BidModel is linked as acceptedBidId (Idempotent)
      let existingBid: any = null;
      if (resolvedPartnerDoc) {
        existingBid = await BidModel.findOne({
          bookingId: booking._id,
          partnerId: resolvedPartnerDoc._id,
        }).session(session);

        const bidPrice = quotedAmount || booking.finalAmount || booking.acceptedQuoteAmount || 0;

        if (!existingBid) {
          const [newBid] = await BidModel.create(
            [
              {
                bookingId: booking._id,
                partnerId: resolvedPartnerDoc._id,
                quotedAmount: bidPrice,
                estimatedDuration: 'Same Day',
                status: 'ACCEPTED',
                notes: reason || 'Assigned directly by Super Admin',
              },
            ],
            { session }
          );
          existingBid = newBid;
        } else {
          existingBid.status = 'ACCEPTED';
          if (quotedAmount) existingBid.quotedAmount = quotedAmount;
          await existingBid.save({ session });
        }

        booking.acceptedBidId = existingBid._id;
        if (!booking.forwardedBidIds?.some((bId: any) => bId.toString() === existingBid._id.toString())) {
          booking.forwardedBidIds = [...(booking.forwardedBidIds || []), existingBid._id];
        }
      }

      // 7. Save Booking within session
      await booking.save({ session });

      // 8. Create or Update JobModel with correct schema & status mapping (Idempotent)
      if (resolvedPartnerDoc) {
        let targetJobStatus: 'NOT_STARTED' | 'VERIFIED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' = 'NOT_STARTED';

        if (status === 'COMPLETED') {
          targetJobStatus = 'COMPLETED';
        } else if (status === 'IN_PROGRESS') {
          targetJobStatus = 'IN_PROGRESS';
        } else if (status === 'CANCELLED') {
          targetJobStatus = 'CANCELLED';
        } else if (status === 'VERIFIED') {
          targetJobStatus = 'VERIFIED';
        } else {
          targetJobStatus = (booking as any).isVerifiedByPartner ? 'VERIFIED' : 'NOT_STARTED';
        }

        const linkedBidId = existingBid?._id || booking.acceptedBidId || new mongoose.Types.ObjectId();
        const finalJobAmount = quotedAmount || booking.finalAmount || booking.acceptedQuoteAmount || 0;

        const existingJob = await JobModel.findOne({ bookingId: booking._id }).session(session);

        if (!existingJob) {
          await JobModel.create(
            [
              {
                bookingId: booking._id,
                partnerId: resolvedPartnerDoc._id,
                bidId: linkedBidId,
                status: targetJobStatus,
                finalAmount: finalJobAmount,
              },
            ],
            { session }
          );
          updatesPerformed.push(`Job created with status '${targetJobStatus}'`);
        } else {
          existingJob.partnerId = resolvedPartnerDoc._id;
          existingJob.bidId = linkedBidId;
          existingJob.status = targetJobStatus;
          existingJob.finalAmount = finalJobAmount;
          await existingJob.save({ session });
          updatesPerformed.push(`Existing job updated to status '${targetJobStatus}'`);
        }
      }

      // 9. Snapshot newValues and write AuditLog within transaction
      const newValues = {
        status: booking.status,
        assignedPartnerId: booking.assignedPartnerId,
        assignedExecutiveId: booking.assignedExecutiveId,
        acceptedQuoteAmount: booking.acceptedQuoteAmount,
        finalAmount: booking.finalAmount,
        pricing: booking.pricing ? JSON.parse(JSON.stringify(booking.pricing)) : undefined,
        hasPaidAdvance: booking.hasPaidAdvance,
        isAdvancePaid: (booking as any).isAdvancePaid,
        paymentStatus: (booking as any).paymentStatus,
        verificationCode: (booking as any).verificationCode,
      };

      await AuditLogModel.create(
        [
          {
            userId: adminUserId && mongoose.Types.ObjectId.isValid(adminUserId) ? adminUserId : undefined,
            userRole: adminRole || 'SUPER_ADMIN',
            action: 'SUPER_ADMIN_MANUAL_BYPASS',
            endpoint: `/api/super-admin/bookings/${bookingId}/manual-assign`,
            method: 'POST',
            payload: {
              bookingId,
              partnerId: resolvedPartnerDoc?._id || partnerId,
              executiveId,
              status,
              quotedAmount,
              overridePayment,
              reason: reason || 'Manual workflow override by Super Admin',
              summary: updatesPerformed.join(', '),
              previousValues,
              newValues,
            },
            ipAddress: clientIp,
            status: 'SUCCESS',
          },
        ],
        { session }
      );

      // 10. Commit transaction
      await session.commitTransaction();
      session.endSession();

      // 11. Emit live socket events & notifications (after successful commit)
      try {
        const { emitToRole, emitToUser } = require('../../../../sockets');
        emitToRole('SUPER_ADMIN', 'booking_status_update', booking);
        emitToRole('EXECUTIVE', 'booking_status_update', booking);
        if (booking.customerId) {
          emitToUser(booking.customerId.toString(), 'booking_status_update', booking);
        }
        if (resolvedPartnerDoc?.userId) {
          emitToUser(resolvedPartnerDoc.userId.toString(), 'job_assigned', {
            bookingId: booking._id,
            jobStatus: booking.status,
          });
          emitToUser(resolvedPartnerDoc.userId.toString(), 'booking_status_update', booking);
        }
        if (executiveId) {
          emitToUser(executiveId.toString(), 'booking_assigned', {
            bookingId: booking._id,
          });
        }
      } catch (socketErr) {
        console.error('Socket emission error during manual bypass:', socketErr);
      }

      return booking;
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();

      // Log failure in audit log
      try {
        await AuditLogModel.create({
          userId: adminUserId && mongoose.Types.ObjectId.isValid(adminUserId) ? adminUserId : undefined,
          userRole: adminRole || 'SUPER_ADMIN',
          action: 'SUPER_ADMIN_MANUAL_BYPASS_FAILED',
          endpoint: `/api/super-admin/bookings/${bookingId}/manual-assign`,
          method: 'POST',
          payload: {
            bookingId,
            partnerId,
            executiveId,
            status,
            quotedAmount,
            overridePayment,
            reason,
          },
          ipAddress: clientIp,
          status: 'FAILED',
          errorMessage: error?.message || 'Manual bypass failed',
        });
      } catch (auditFailErr) {
        console.error('Failed to log audit failure:', auditFailErr);
      }

      throw error;
    }
  }

  async getEligiblePartners(bookingId: string, query: any = {}) {
    const { PartnerEligibilityService } = require('../../../partner/partner-eligibility.service');
    return PartnerEligibilityService.getEligiblePartnersForBooking(bookingId, query);
  }
}

export const superAdminBookingsService = new SuperAdminBookingsService();
