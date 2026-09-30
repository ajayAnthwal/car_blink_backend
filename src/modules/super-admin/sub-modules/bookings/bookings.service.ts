import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';
import { UserModel } from '../../../user/user.model';
import { PartnerModel } from '../../../partner/partner.model';
import { ServiceModel } from '../../../master-data/models/service.model';
import { GarageModel } from '../../../customer/sub-modules/garage/garage.model';
import { CityModel } from '../../../master-data/models/city.model';
import { BidModel } from '../../../partner/sub-modules/bidding/bid.model';
import { BOOKING_STATUS } from '../../../../common/constants/status.constant';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
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
        .populate({
          path: 'acceptedBidId',
          populate: {
            path: 'partnerId',
            select: 'businessName userId contactNumber',
            populate: { path: 'userId', select: 'fullName email' }
          }
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
          .populate({
            path: 'acceptedBidId',
            populate: {
              path: 'partnerId',
              select: 'businessName userId contactNumber',
              populate: { path: 'userId', select: 'fullName email' }
            }
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

    const [invoice, job, payment] = await Promise.all([
      InvoiceModel.findOne({ $or: [{ bookingId: booking._id }, { jobId: booking.jobId }] }).lean().catch(() => null),
      JobModel.findOne({ bookingId: booking._id }).lean().catch(() => null),
      PaymentModel.findOne({ bookingId: booking._id }).lean().catch(() => null)
    ]);

    return {
      ...booking,
      invoice,
      job,
      payment
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
    }
  ) {
    const { partnerId, executiveId, status, quotedAmount, overridePayment, reason } = data;

    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const prevStatus = booking.status;
    const updatesPerformed: string[] = [];

    if (partnerId && mongoose.Types.ObjectId.isValid(partnerId)) {
      booking.assignedPartnerId = partnerId as any;
      updatesPerformed.push(`Partner assigned (${partnerId})`);
    }

    if (executiveId && mongoose.Types.ObjectId.isValid(executiveId)) {
      booking.assignedExecutiveId = executiveId as any;
      updatesPerformed.push(`Executive assigned (${executiveId})`);
    }

    if (status) {
      booking.status = status as any;
      updatesPerformed.push(`Status changed from ${prevStatus} to ${status}`);
    }

    if (overridePayment) {
      booking.hasPaidAdvance = true;
      const { PaymentModel } = require('../../../payment/payment.model');
      const existingSuccessPayment = await PaymentModel.findOne({ bookingId: booking._id, status: 'SUCCESS' });
      if (!existingSuccessPayment) {
        await PaymentModel.create({
          bookingId: booking._id,
          customerId: booking.customerId,
          amount: quotedAmount || 500,
          paymentType: 'ADVANCE',
          status: 'SUCCESS',
          provider: 'SUPER_ADMIN_BYPASS',
          paidAt: new Date(),
        });
      }
      updatesPerformed.push(`Payment requirement bypassed & marked as PAID`);
    }

    await booking.save();

    if (partnerId && mongoose.Types.ObjectId.isValid(partnerId)) {
      const { JobModel } = require('../../../partner/sub-modules/jobs/job.model');
      const existingJob = await JobModel.findOne({ bookingId: booking._id });
      const jobStatus = status === 'COMPLETED' ? 'COMPLETED' : status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'ASSIGNED';

      if (!existingJob) {
        await JobModel.create({
          bookingId: booking._id,
          partnerId: partnerId,
          customerId: booking.customerId,
          serviceId: booking.serviceId,
          vehicleId: booking.vehicleId,
          status: jobStatus,
          jobDetails: { finalAmount: quotedAmount || 0 },
        });
      } else {
        existingJob.partnerId = partnerId as any;
        if (status) existingJob.status = jobStatus as any;
        if (quotedAmount) {
          existingJob.jobDetails = existingJob.jobDetails || {};
          existingJob.jobDetails.finalAmount = quotedAmount;
        }
        await existingJob.save();
      }
    }

    // Write audit log entry
    try {
      const AuditLog = require('../audit-logs/audit-log.model').default;
      await AuditLog.create({
        userId: adminUserId,
        userRole: adminRole || 'SUPER_ADMIN',
        action: 'SUPER_ADMIN_MANUAL_BYPASS',
        endpoint: `/api/super-admin/bookings/${bookingId}/manual-assign`,
        method: 'POST',
        payload: {
          bookingId,
          partnerId,
          executiveId,
          status,
          quotedAmount,
          overridePayment,
          reason: reason || 'Manual workflow override by Super Admin',
          summary: updatesPerformed.join(', '),
        },
        status: 'SUCCESS',
      });
    } catch (auditErr) {
      console.error('Audit Log Error:', auditErr);
    }

    return booking;
  }
}

export const superAdminBookingsService = new SuperAdminBookingsService();
