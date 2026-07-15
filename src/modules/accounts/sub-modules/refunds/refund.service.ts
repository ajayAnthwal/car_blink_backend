import { RefundModel, IRefund } from './refund.model';
import { PaymentModel } from '../../../payment/payment.model';
import { PAYMENT_STATUS } from '../../../../common/constants/status.constant';
import { notificationService } from '../../../notification/notification.service';
import { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } from '../../../notification/notification.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { ConflictError } from '../../../../common/errors/ConflictError';
import { ApiError } from '../../../../common/errors/ApiError';
import { ERROR_CODES } from '../../../../common/constants/error-codes.constant';
import { logger } from '../../../../config/logger.config';

export class RefundService {
  /**
   * Get all refunds with pagination and optional status filter
   */
  async getAllRefunds(
    query: any = {}
  ): Promise<{ refunds: IRefund[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.status) {
      filter.status = query.status;
    }

    const [refunds, total] = await Promise.all([
      RefundModel.find(filter)
        .populate('customerId', 'fullName email phone')
        .populate('bookingId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      RefundModel.countDocuments(filter),
    ]);

    return { refunds, total, page, limit };
  }

  /**
   * Initiate a refund request
   */
  async initiateRefund(
    accountsId: string,
    data: { paymentId: string; amount: number; reason: string }
  ): Promise<IRefund> {
    const payment = await PaymentModel.findById(data.paymentId);
    if (!payment) {
      throw new NotFoundError('Payment record not found');
    }

    if (payment.status !== PAYMENT_STATUS.SUCCESS) {
      throw new ApiError(
        400,
        "Can't refund a payment that was never successful",
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (data.amount > payment.amount) {
      throw new ApiError(
        400,
        'Refund amount cannot exceed the original payment amount',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Verify no existing PROCESSED refund exists for this payment
    const existingProcessedRefund = await RefundModel.findOne({
      paymentId: data.paymentId,
      status: 'PROCESSED',
    });
    if (existingProcessedRefund) {
      throw new ConflictError('This payment has already been refunded');
    }

    const refund = await RefundModel.create({
      paymentId: data.paymentId,
      bookingId: payment.bookingId,
      customerId: payment.customerId,
      amount: data.amount,
      reason: data.reason,
      status: 'REQUESTED',
      processedByAccountsId: accountsId,
    });

    return refund;
  }

  /**
   * Approve a refund request (REQUESTED -> APPROVED)
   */
  async approveRefund(accountsId: string, refundId: string): Promise<IRefund> {
    const refund = await RefundModel.findById(refundId);
    if (!refund) {
      throw new NotFoundError('Refund record not found');
    }

    if (refund.status !== 'REQUESTED') {
      throw new ApiError(
        400,
        'Refund must be in REQUESTED status to be approved',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    refund.status = 'APPROVED';
    refund.processedByAccountsId = accountsId as any;
    await refund.save();

    return refund;
  }

  /**
   * Process a refund request (APPROVED -> PROCESSED)
   */
  async processRefund(accountsId: string, refundId: string): Promise<IRefund> {
    const refund = await RefundModel.findById(refundId);
    if (!refund) {
      throw new NotFoundError('Refund record not found');
    }

    if (refund.status !== 'APPROVED') {
      throw new ApiError(
        400,
        'Refund must be APPROVED before it can be processed',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    refund.status = 'PROCESSED';
    refund.processedByAccountsId = accountsId as any;
    await refund.save();

    // Update related Payment status to REFUNDED
    const payment = await PaymentModel.findById(refund.paymentId);
    if (payment) {
      payment.status = PAYMENT_STATUS.REFUNDED;
      await payment.save();
    }

    // Trigger customer notification (try-catch wrapped)
    try {
      await notificationService.sendNotification(
        refund.customerId.toString(),
        NOTIFICATION_TYPE.SMS,
        NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
        'Refund Processed',
        `Your refund of INR ${refund.amount} has been successfully processed.`,
        { refundId: refund._id.toString(), paymentId: refund.paymentId.toString() }
      );
    } catch (notifErr: any) {
      logger.warn('Failed to send refund processed SMS notification:', notifErr);
    }

    return refund;
  }

  /**
   * Reject a refund request
   */
  async rejectRefund(
    accountsId: string,
    refundId: string,
    rejectionReason: string
  ): Promise<IRefund> {
    const refund = await RefundModel.findById(refundId);
    if (!refund) {
      throw new NotFoundError('Refund record not found');
    }

    if (refund.status === 'PROCESSED') {
      throw new ApiError(
        400,
        'Cannot reject a refund that is already PROCESSED',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    refund.status = 'REJECTED';
    refund.rejectionReason = rejectionReason;
    refund.processedByAccountsId = accountsId as any;
    await refund.save();

    return refund;
  }
}

export const refundService = new RefundService();
export default refundService;
