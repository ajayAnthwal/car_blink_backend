import { SettlementModel, ISettlement } from './settlement.model';
import { JobModel } from '../../../partner/sub-modules/jobs/job.model';
import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';
import { PaymentModel } from '../../../payment/payment.model';
import { PartnerModel } from '../../../partner/partner.model';
import { GarageModel } from '../../../customer/sub-modules/garage/garage.model';
import { notificationService } from '../../../notification/notification.service';
import { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } from '../../../notification/notification.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { ConflictError } from '../../../../common/errors/ConflictError';
import { ApiError } from '../../../../common/errors/ApiError';
import { ERROR_CODES } from '../../../../common/constants/error-codes.constant';
import { logger } from '../../../../config/logger.config';
import { BOOKING_STATUS, PAYMENT_STATUS } from '../../../../common/constants/status.constant';
import { emitToUser } from '../../../../sockets';

export class SettlementService {
  /**
   * Find completed Jobs that don't yet have a Settlement record,
   * where the related Booking is COMPLETED and a SUCCESS payment exists.
   */
  async getEligibleJobsForSettlement(query: any = {}): Promise<any[]> {
    // 1. Get all jobIds that are already settled
    const settledJobIds = await SettlementModel.find({}).distinct('jobId');

    // 2. Fetch completed unsettled jobs
    const jobs = await JobModel.find({
      status: 'COMPLETED',
      _id: { $nin: settledJobIds },
    })
      .populate({
        path: 'bookingId',
        populate: [{ path: 'vehicleId' }, { path: 'serviceId' }, { path: 'cityId' }],
      })
      .populate({
        path: 'partnerId',
        select: 'businessName userId',
      });

    // 3. Filter in memory to check related Booking status & Payment success
    const eligibleJobs: any[] = [];
    for (const job of jobs) {
      const booking = job.bookingId as any;
      if (!booking || booking.status !== BOOKING_STATUS.COMPLETED) {
        continue;
      }

      const payments = await PaymentModel.find({
        bookingId: booking._id,
        status: PAYMENT_STATUS.SUCCESS,
      });

      if (payments.length > 0) {
        let cashCollected = 0;
        let onlinePaid = 0;
        payments.forEach(p => {
          if (p.provider === 'CASH') cashCollected += p.amount;
          else onlinePaid += p.amount;
        });

        const jobObj = job.toObject() as any;
        jobObj.cashCollected = cashCollected;
        jobObj.onlinePaid = onlinePaid;
        
        eligibleJobs.push(jobObj);
      }
    }

    return eligibleJobs;
  }

  /**
   * Generate a pending settlement record for a completed job
   */
  async generateSettlement(
    accountsId: string,
    jobId: string,
    commissionPercent: number,
    deductions: { tdsPercent?: number; otherDeductions?: number } = {}
  ): Promise<ISettlement> {
    // 1. Check if already settled
    const existing = await SettlementModel.findOne({ jobId });
    if (existing) {
      throw new ConflictError('This job has already been settled');
    }

    // 2. Fetch Job details
    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job record not found');
    }

    if (job.status !== 'COMPLETED') {
      throw new ApiError(
        400,
        'Job must be in COMPLETED status to generate settlement',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // 3. Validate related Booking and Payment
    const booking = await BookingModel.findById(job.bookingId);
    if (!booking || booking.status !== BOOKING_STATUS.COMPLETED) {
      throw new ApiError(
        400,
        'Related booking must be COMPLETED to generate settlement',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const successPayment = await PaymentModel.findOne({
      bookingId: booking._id,
      status: PAYMENT_STATUS.SUCCESS,
    });
    if (!successPayment) {
      throw new ApiError(
        400,
        'A successful payment must exist for the booking to generate settlement',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // 4. Compute amounts
    const grossAmount = job.finalAmount ?? 0;
    const platformCommission = grossAmount * (commissionPercent / 100);
    const amountAfterCommission = grossAmount - platformCommission;
    
    // Calculate TDS (usually on gross or amountAfterCommission, assuming on gross for now)
    const tdsAmount = grossAmount * ((deductions.tdsPercent || 0) / 100);
    const otherDeductions = deductions.otherDeductions || 0;
    
    const netPayoutAmount = amountAfterCommission - tdsAmount - otherDeductions;

    // 5. Create Settlement
    const settlement = await SettlementModel.create({
      partnerId: job.partnerId,
      jobId,
      grossAmount,
      platformCommission: Number(platformCommission.toFixed(2)),
      tdsAmount: Number(tdsAmount.toFixed(2)),
      otherDeductions: Number(otherDeductions.toFixed(2)),
      netPayoutAmount: Number(netPayoutAmount.toFixed(2)),
      status: 'PENDING',
      processedByAccountsId: accountsId,
    });

    try {
      const partner = await PartnerModel.findById(job.partnerId);
      if (partner) {
        const notifService = require('../../../notification/notification.service').notificationService;
        const notifModel = require('../../../notification/notification.model');
        await notifService.sendNotification(
          partner.userId.toString(),
          notifModel.NOTIFICATION_TYPE.IN_APP,
          notifModel.NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
          'Settlement Generated',
          `A new settlement of INR ${settlement.netPayoutAmount} has been generated for job ${job._id}.`,
          { settlementId: settlement._id.toString() }
        );
        emitToUser(partner.userId.toString(), 'settlement_updated', { settlementId: settlement._id.toString() });
      }
    } catch (e) {
      logger.warn('Failed to emit settlement event', e);
    }

    return settlement;
  }

  /**
   * Get all settlements with pagination and status/partner filters
   */
  async getAllSettlements(
    query: any = {}
  ): Promise<{ settlements: ISettlement[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) {
      filter.status = query.status;
    }
    if (query.partnerId) {
      filter.partnerId = query.partnerId;
    }

    const [settlements, total] = await Promise.all([
      SettlementModel.find(filter)
        .populate({
          path: 'partnerId',
          select: 'businessName userId',
          populate: { path: 'userId', select: 'fullName' },
        })
        .populate('jobId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SettlementModel.countDocuments(filter),
    ]);

    return { settlements, total, page, limit };
  }

  /**
   * Process a payout settlement (PENDING -> PROCESSED)
   */
  async processSettlement(
    accountsId: string,
    settlementId: string,
    transactionReference: string
  ): Promise<ISettlement> {
    const settlement = await SettlementModel.findById(settlementId);
    if (!settlement) {
      throw new NotFoundError('Settlement record not found');
    }

    if (settlement.status !== 'PENDING') {
      throw new ApiError(
        400,
        'Only PENDING settlements can be processed',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    settlement.status = 'PROCESSED';
    settlement.processedAt = new Date();
    settlement.transactionReference = transactionReference;
    settlement.processedByAccountsId = accountsId as any;
    await settlement.save();

    // Notify Partner (try-catch wrapped)
    try {
      const partner = await PartnerModel.findById(settlement.partnerId);
      if (partner) {
        await notificationService.sendNotification(
          partner.userId.toString(),
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
          'Settlement Processed',
          `Your payout settlement of INR ${settlement.netPayoutAmount} has been processed. Ref: ${transactionReference}`,
          { settlementId: settlement._id.toString(), jobId: settlement.jobId.toString() }
        );
        emitToUser(partner.userId.toString(), 'settlement_updated', { settlementId: settlement._id.toString() });
      }
    } catch (notifErr: any) {
      logger.warn('Failed to send settlement processed notification to partner:', notifErr);
    }

    return settlement;
  }

  /**
   * Get payout settlement history for a specific partner
   */
  async getPartnerSettlementHistory(
    partnerId: string,
    query: any = {}
  ): Promise<{ settlements: ISettlement[]; total: number; page: number; limit: number }> {
    query.partnerId = partnerId;
    return this.getAllSettlements(query);
  }
}

export const settlementService = new SettlementService();
export default settlementService;
