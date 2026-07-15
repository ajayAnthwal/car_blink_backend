import crypto from 'crypto';
import mongoose from 'mongoose';
import { PaymentModel, IPayment } from './payment.model';
import { BookingModel } from '../customer/sub-modules/booking/booking.model';
import { razorpayProvider } from './providers/razorpay.provider';
import { NotFoundError } from '../../common/errors/NotFoundError';
import { UnauthorizedError } from '../../common/errors/UnauthorizedError';
import { BadRequestError } from '../../common/errors/BadRequestError';
import { env } from '../../config/env.config';
import { logger } from '../../config/logger.config';
import { PAYMENT_STATUS, PAYMENT_TYPE, PAYMENT_PROVIDER, BOOKING_STATUS } from '../../common/constants/status.constant';

export class PaymentService {
  /**
   * Initiate a new payment order
   */
  async initiatePayment(
    customerId: string,
    bookingId: string,
    amount: number,
    paymentType: PAYMENT_TYPE
  ): Promise<{ orderId: string; amount: number; currency: string; key: string }> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    // Verify ownership
    if (booking.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You are not authorized to initiate payment for this booking');
    }

    // Verify booking state depending on paymentType
    if (paymentType === PAYMENT_TYPE.ADVANCE) {
      if (booking.status !== BOOKING_STATUS.ACCEPTED) {
        throw new BadRequestError('Advance payment requires the booking to be in ACCEPTED status');
      }
    } else if (paymentType === PAYMENT_TYPE.FINAL) {
      if (booking.status !== BOOKING_STATUS.COMPLETED) {
        throw new BadRequestError('Final payment requires the booking to be in COMPLETED status');
      }
    } else if (paymentType === PAYMENT_TYPE.FULL) {
      if (
        booking.status !== BOOKING_STATUS.ACCEPTED &&
        booking.status !== BOOKING_STATUS.IN_PROGRESS &&
        booking.status !== BOOKING_STATUS.COMPLETED
      ) {
        throw new BadRequestError('Full payment requires the booking to be ACCEPTED, IN_PROGRESS, or COMPLETED');
      }
    }

    const tempPaymentId = new mongoose.Types.ObjectId();

    // Call the provider to create an order
    const order = await razorpayProvider.createOrder(amount, 'INR', tempPaymentId.toString());

    // Create Payment document in database with status CREATED
    await PaymentModel.create({
      _id: tempPaymentId,
      bookingId,
      customerId,
      amount,
      currency: 'INR',
      paymentType,
      provider: PAYMENT_PROVIDER.RAZORPAY,
      providerOrderId: order.orderId,
      status: PAYMENT_STATUS.CREATED,
    });

    return {
      orderId: order.orderId,
      amount,
      currency: 'INR',
      key: env.RAZORPAY_KEY_ID || 'mock_key',
    };
  }

  /**
   * Verify payment signature and capture payment
   */
  async verifyAndCapturePayment(
    customerId: string,
    data: { paymentId: string; orderId: string; signature: string }
  ): Promise<IPayment> {
    const payment = await PaymentModel.findOne({ providerOrderId: data.orderId });
    if (!payment) {
      throw new NotFoundError('Payment record not found');
    }

    // Ownership check
    if (payment.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You are not authorized to verify this payment');
    }

    const isValid = await razorpayProvider.verifyPaymentSignature(
      data.orderId,
      data.paymentId,
      data.signature
    );

    if (isValid) {
      payment.status = PAYMENT_STATUS.SUCCESS;
      payment.providerPaymentId = data.paymentId;
      payment.paidAt = new Date();
      await payment.save();

      // Notify customer of successful payment
      try {
        const { notificationService } = require('../notification/notification.service');
        const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../notification/notification.model');
        const payAmount = payment.amount;
        
        // SMS
        await notificationService.sendNotification(
          payment.customerId.toString(),
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
          'Payment Successful',
          `Your payment of INR ${payAmount} for booking ${payment.bookingId} has been successfully processed.`,
          { bookingId: payment.bookingId.toString(), paymentId: payment._id.toString() }
        );
        
        // EMAIL
        await notificationService.sendNotification(
          payment.customerId.toString(),
          NOTIFICATION_TYPE.EMAIL,
          NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
          'Payment Successful',
          `We have successfully processed your payment of INR ${payAmount} for booking ${payment.bookingId}. Thank you for using Carblink.`,
          { bookingId: payment.bookingId.toString(), paymentId: payment._id.toString() }
        );
      } catch (notifErr: any) {
        logger.warn('Failed to send payment success notifications:', notifErr);
      }

      return payment;
    } else {
      payment.status = PAYMENT_STATUS.FAILED;
      payment.failureReason = 'Signature verification failed';
      await payment.save();
      throw new BadRequestError('Invalid payment signature. Verification failed.');
    }
  }

  /**
   * Get paginated payment history for a customer
   */
  async getMyPayments(
    customerId: string,
    query: any = {}
  ): Promise<{ payments: IPayment[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      PaymentModel.find({ customerId })
        .populate('bookingId', 'status description')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PaymentModel.countDocuments({ customerId }),
    ]);

    return { payments, total, page, limit };
  }

  /**
   * Get specific payment by ID (enforcing ownership)
   */
  async getPaymentById(customerId: string, paymentId: string): Promise<IPayment> {
    const payment = await PaymentModel.findById(paymentId).populate('bookingId', 'status description');
    if (!payment) {
      throw new NotFoundError('Payment record not found');
    }

    if (payment.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You are not authorized to view this payment');
    }

    return payment;
  }

  /**
   * Handle Razorpay webhook notifications
   */
  async handleWebhook(payload: any, signature?: string): Promise<any> {
    const isMock = !env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET;

    if (isMock) {
      logger.info('Razorpay Webhook received in MOCK MODE:', JSON.stringify(payload));
      return { success: true, mock: true };
    }

    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const shasum = crypto.createHmac('sha256', webhookSecret);
      shasum.update(JSON.stringify(payload));
      const expectedSignature = shasum.digest('hex');

      if (expectedSignature !== signature) {
        logger.error('Razorpay Webhook signature verification failed');
        throw new BadRequestError('Invalid webhook signature');
      }
    }

    // Process event
    const event = payload.event;
    if (event === 'payment.captured') {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId && paymentId) {
        const payment = await PaymentModel.findOne({ providerOrderId: orderId });
        if (payment && payment.status !== PAYMENT_STATUS.SUCCESS) {
          payment.status = PAYMENT_STATUS.SUCCESS;
          payment.providerPaymentId = paymentId;
          payment.paidAt = new Date();
          await payment.save();
          logger.info(`Webhook successfully processed: Payment ${payment._id} set to SUCCESS`);
        }
      }
    } else if (event === 'payment.failed') {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const errorDescription = paymentEntity?.error_description || 'Payment failed';

      if (orderId) {
        const payment = await PaymentModel.findOne({ providerOrderId: orderId });
        if (payment && payment.status !== PAYMENT_STATUS.SUCCESS) {
          payment.status = PAYMENT_STATUS.FAILED;
          payment.failureReason = errorDescription;
          await payment.save();
          logger.info(`Webhook successfully processed: Payment ${payment._id} set to FAILED`);
        }
      }
    }

    return { success: true };
  }
}

export const paymentService = new PaymentService();
