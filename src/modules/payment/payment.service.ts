import crypto from "crypto";
import mongoose from "mongoose";
import { PaymentModel, IPayment } from "./payment.model";
import { BookingModel } from "../customer/sub-modules/booking/booking.model";
import { JobModel } from "../partner/sub-modules/jobs/job.model";
import { PartnerModel } from "../partner/partner.model";
import { razorpayProvider } from "./providers/razorpay.provider";
import { NotFoundError } from "../../common/errors/NotFoundError";
import { UnauthorizedError } from "../../common/errors/UnauthorizedError";
import { BadRequestError } from "../../common/errors/BadRequestError";
import { ConflictError } from "../../common/errors/ConflictError";
import { env } from "../../config/env.config";
import { logger } from "../../config/logger.config";
import {
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  PAYMENT_PROVIDER,
  BOOKING_STATUS,
} from "../../common/constants/status.constant";
import { emitToUser, emitToRole } from "../../sockets";
export class PaymentService {
  /**
   * Initiate a new payment order
   */
  async initiatePayment(
    customerId: string,
    bookingId: string,
    amount: number,
    paymentType: PAYMENT_TYPE,
    couponCode?: string,
  ): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    key: string;
  }> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    // Verify ownership
    if (booking.customerId.toString() !== customerId) {
      throw new UnauthorizedError(
        "You are not authorized to initiate payment for this booking",
      );
    }

    // Verify booking state depending on paymentType
    if (paymentType === PAYMENT_TYPE.ADVANCE) {
      if (
        booking.status !== BOOKING_STATUS.ACCEPTED &&
        booking.status !== BOOKING_STATUS.IN_PROGRESS &&
        booking.status !== BOOKING_STATUS.COMPLETED
      ) {
        throw new BadRequestError(
          "Advance payment requires the booking to be in ACCEPTED, IN_PROGRESS, or COMPLETED status",
        );
      }
    } else if (paymentType === PAYMENT_TYPE.FINAL) {
      if (booking.status !== BOOKING_STATUS.COMPLETED) {
        throw new BadRequestError(
          "Final payment requires the booking to be in COMPLETED status",
        );
      }
    } else if (paymentType === PAYMENT_TYPE.FULL) {
      if (
        booking.status !== BOOKING_STATUS.ACCEPTED &&
        booking.status !== BOOKING_STATUS.IN_PROGRESS &&
        booking.status !== BOOKING_STATUS.COMPLETED
      ) {
        throw new BadRequestError(
          "Full payment requires the booking to be ACCEPTED, IN_PROGRESS, or COMPLETED",
        );
      }
    }

    let baseAmount = amount;
    let discountAmount = 0;

    // Legacy support: if frontend sends couponCode, apply to installment
    if (couponCode && !booking.appliedCoupon) {
      const { CouponService } = require("../super-admin/sub-modules/coupons/coupons.service");
      const coupon = await CouponService.validate(couponCode);
      if (!coupon) {
        throw new BadRequestError("Invalid or expired coupon code");
      }
      if (coupon.currentUses >= coupon.maxUses) {
        throw new BadRequestError("Coupon usage limit reached");
      }
      
      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = baseAmount * (coupon.discountValue / 100);
      } else {
        discountAmount = coupon.discountValue;
      }
      
      if (discountAmount > baseAmount) discountAmount = baseAmount;
      amount = baseAmount - discountAmount;
    } else if (booking.appliedCoupon) {
       couponCode = booking.appliedCoupon;
       // We don't recalculate discountAmount here because the frontend already passed the correctly discounted installment amount
    }

    const tempPaymentId = new mongoose.Types.ObjectId();

    // Call the provider to create an order
    const order = await razorpayProvider.createOrder(
      amount,
      "INR",
      tempPaymentId.toString(),
    );

    // Create Payment document in database with status CREATED
    await PaymentModel.create({
      _id: tempPaymentId,
      bookingId,
      customerId,
      amount,
      baseAmount,
      discountAmount,
      couponCode,
      currency: "INR",
      paymentType,
      provider: PAYMENT_PROVIDER.RAZORPAY,
      providerOrderId: order.orderId,
      status: PAYMENT_STATUS.CREATED,
    });

    return {
      orderId: order.orderId,
      amount,
      currency: "INR",
      key: env.RAZORPAY_KEY_ID || "mock_key",
    };
  }

  /**
   * Verify payment signature and capture payment
   */
  async verifyAndCapturePayment(
    customerId: string,
    data: { paymentId: string; orderId: string; signature: string },
  ): Promise<IPayment> {
    const payment = await PaymentModel.findOne({
      providerOrderId: data.orderId,
    });
    if (!payment) {
      throw new NotFoundError("Payment record not found");
    }

    // Ownership check
    if (payment.customerId.toString() !== customerId) {
      throw new UnauthorizedError(
        "You are not authorized to verify this payment",
      );
    }

    const isValid = await razorpayProvider.verifyPaymentSignature(
      data.orderId,
      data.paymentId,
      data.signature,
    );

    if (isValid) {
      payment.status = PAYMENT_STATUS.SUCCESS;
      payment.providerPaymentId = data.paymentId;
      payment.paidAt = new Date();
      await payment.save();

      if (payment.couponCode) {
        const { CouponService } = require("../super-admin/sub-modules/coupons/coupons.service");
        await CouponService.incrementCouponUsage(payment.couponCode);
      }

      // Notify customer of successful payment
      try {
        const {
          notificationService,
        } = require("../notification/notification.service");
        const {
          NOTIFICATION_TYPE,
          NOTIFICATION_CATEGORY,
        } = require("../notification/notification.model");
        const payAmount = payment.amount;

        // SMS
        await notificationService.sendNotification(
          payment.customerId.toString(),
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
          "Payment Successful",
          `Your payment of INR ${payAmount} for booking ${payment.bookingId} has been successfully processed.`,
          {
            bookingId: payment.bookingId.toString(),
            paymentId: payment._id.toString(),
          },
        );

        // EMAIL
        await notificationService.sendNotification(
          payment.customerId.toString(),
          NOTIFICATION_TYPE.EMAIL,
          NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
          "Payment Successful",
          `We have successfully processed your payment of INR ${payAmount} for booking ${payment.bookingId}. Thank you for using Carblink.`,
          {
            bookingId: payment.bookingId.toString(),
            paymentId: payment._id.toString(),
          },
        );
      } catch (notifErr: any) {
        logger.warn("Failed to send payment success notifications:", notifErr);
      }

      // Emit live updates to dashboards
      try {
        const payload = {
          bookingId: payment.bookingId,
          paymentId: payment._id,
          status: payment.status,
          amount: payment.amount,
          type: payment.paymentType,
          method: payment.provider,
        };
        emitToUser(
          payment.customerId.toString(),
          "payment_status_update",
          payload,
        );

        const job = await JobModel.findOne({ bookingId: payment.bookingId });
        if (job && job.partnerId) {
          const notifService = require('../notification/notification.service').notificationService;
          const notifModel = require('../notification/notification.model');
          await notifService.sendNotification(
            job.partnerId.toString(),
            notifModel.NOTIFICATION_TYPE.IN_APP,
            notifModel.NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
            "Payment Received",
            `A payment of INR ${payment.amount} has been processed for booking ${payment.bookingId}.`,
            payload
          );
          emitToUser(
            job.partnerId.toString(),
            "payment_status_update",
            payload,
          );
        }
        const notifService = require('../notification/notification.service').notificationService;
        const notifModel = require('../notification/notification.model');

        await notifService.sendToRole(
          'SUPER_ADMIN',
          notifModel.NOTIFICATION_TYPE.IN_APP,
          notifModel.NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
          'Payment Successful',
          `Payment of INR ${payment.amount} received.`,
          payload
        );
        await notifService.sendToRole(
          'ACCOUNTS',
          notifModel.NOTIFICATION_TYPE.IN_APP,
          notifModel.NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
          'Payment Successful',
          `Payment of INR ${payment.amount} received.`,
          payload
        );
      } catch (socketErr) {
        logger.warn("Failed to emit payment sockets:", socketErr);
      }

      return payment;
    } else {
      payment.status = PAYMENT_STATUS.FAILED;
      payment.failureReason = "Signature verification failed";
      await payment.save();
      throw new BadRequestError(
        "Invalid payment signature. Verification failed.",
      );
    }
  }

  /**
   * Get paginated payment history for a customer
   */
  async getMyPayments(
    customerId: string,
    query: any = {},
  ): Promise<{
    payments: IPayment[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, parseInt(query.page || "1", 10));
    const limit = Math.max(1, parseInt(query.limit || "10", 10));
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      PaymentModel.find({ customerId })
        .populate("bookingId", "status description")
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
  async getPaymentById(
    customerId: string,
    paymentId: string,
  ): Promise<IPayment> {
    const payment = await PaymentModel.findById(paymentId).populate(
      "bookingId",
      "status description",
    );
    if (!payment) {
      throw new NotFoundError("Payment record not found");
    }

    if (payment.customerId.toString() !== customerId) {
      throw new UnauthorizedError(
        "You are not authorized to view this payment",
      );
    }

    return payment;
  }

  /**
   * Mark a payment as completed offline (CASH)
   */
  async markOfflinePayment(
    bookingId: string,
    amount: number,
    paymentType: PAYMENT_TYPE,
    userId: string, // Could be customer or partner ID
    isPartner: boolean = false,
    couponCode?: string,
  ): Promise<IPayment> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (!isPartner && booking.customerId.toString() !== userId) {
      throw new UnauthorizedError("You are not authorized for this booking");
    }

    // Prevent duplicate payments of the same type
    const existingPayment = await PaymentModel.findOne({
      bookingId,
      paymentType,
      status: { $in: [PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.PENDING] },
    });

    if (existingPayment) {
      throw new ConflictError(
        `A ${paymentType} payment already exists or is pending for this booking.`,
      );
    }

    let baseAmount = amount;
    let discountAmount = 0;

    // Legacy support: if frontend sends couponCode, apply to installment
    if (couponCode && !booking.appliedCoupon) {
      const { CouponService } = require("../super-admin/sub-modules/coupons/coupons.service");
      const coupon = await CouponService.validate(couponCode);
      if (!coupon) {
        throw new BadRequestError("Invalid or expired coupon code");
      }
      if (coupon.currentUses >= coupon.maxUses) {
        throw new BadRequestError("Coupon usage limit reached");
      }
      
      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = baseAmount * (coupon.discountValue / 100);
      } else {
        discountAmount = coupon.discountValue;
      }
      
      if (discountAmount > baseAmount) discountAmount = baseAmount;
      amount = baseAmount - discountAmount;
    } else if (booking.appliedCoupon) {
       couponCode = booking.appliedCoupon;
    }

    const tempPaymentId = new mongoose.Types.ObjectId();
    const providerOrderId = `CASH_${tempPaymentId.toString()}`;

    const finalStatus = isPartner
      ? PAYMENT_STATUS.SUCCESS
      : PAYMENT_STATUS.PENDING;

    const payment = await PaymentModel.create({
      _id: tempPaymentId,
      bookingId,
      customerId: booking.customerId,
      amount,
      baseAmount,
      discountAmount,
      couponCode,
      currency: "INR",
      paymentType,
      provider: PAYMENT_PROVIDER.CASH,
      providerOrderId,
      status: finalStatus,
      paidAt: isPartner ? new Date() : undefined,
    });

    // Update Partner Dues if payment is SUCCESS
    if (finalStatus === PAYMENT_STATUS.SUCCESS) {
      const job = await JobModel.findOne({ bookingId });
      if (job && job.partnerId) {
        const _baseAmount = payment.baseAmount || payment.amount;
        const _discountAmount = payment.discountAmount || 0;
        const commissionAmount = _baseAmount * 0.15;
        const duesToAdd = commissionAmount - _discountAmount;

        await PartnerModel.findByIdAndUpdate(job.partnerId, {
          $inc: { outstandingDues: duesToAdd },
        });
      }

      if (payment.couponCode) {
        const { CouponService } = require("../super-admin/sub-modules/coupons/coupons.service");
        await CouponService.incrementCouponUsage(payment.couponCode);
      }
    }

    // Send notifications if needed
    try {
      const {
        notificationService,
      } = require("../notification/notification.service");
      const {
        NOTIFICATION_TYPE,
        NOTIFICATION_CATEGORY,
      } = require("../notification/notification.model");

      if (isPartner) {
        // Partner collected cash
        await notificationService.sendNotification(
          booking.customerId.toString(),
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
          "Cash Payment Successful",
          `Your offline cash payment of INR ${amount} for booking ${bookingId} has been successfully collected by the partner.`,
          {
            bookingId: booking._id.toString(),
            paymentId: payment._id.toString(),
          },
        );
      } else {
        // Customer intends to pay cash
        // Customer intends to pay cash
        const job = await JobModel.findOne({ bookingId });
        if (job && job.partnerId) {
          await notificationService.sendNotification(
            job.partnerId.toString(),
            NOTIFICATION_TYPE.PUSH,
            NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
            "Cash Payment Requested",
            `The customer has requested to pay INR ${amount} in cash for booking ${bookingId}. Please verify upon collection.`,
            {
              bookingId: booking._id.toString(),
              paymentId: payment._id.toString(),
            },
          );
        }
      }
    } catch (notifErr: any) {
      logger.warn("Failed to send offline payment notifications:", notifErr);
    }

    // Emit live updates
    try {
      const payload = {
        bookingId: payment.bookingId,
        paymentId: payment._id,
        status: payment.status,
        amount: payment.amount,
        type: payment.paymentType,
        method: payment.provider,
      };
      emitToUser(
        booking.customerId.toString(),
        "payment_status_update",
        payload,
      );
      const job = await JobModel.findOne({ bookingId: payment.bookingId });
      if (job && job.partnerId) {
        emitToUser(job.partnerId.toString(), "payment_status_update", payload);
      }
      const notifService = require('../notification/notification.service').notificationService;
      const notifModel = require('../notification/notification.model');

      await notifService.sendToRole(
        'SUPER_ADMIN',
        notifModel.NOTIFICATION_TYPE.IN_APP,
        notifModel.NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
        'Manual Payment Recorded',
        `Manual payment of INR ${payload.amount} recorded.`,
        payload
      );
      await notifService.sendToRole(
        'ACCOUNTS',
        notifModel.NOTIFICATION_TYPE.IN_APP,
        notifModel.NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
        'Manual Payment Recorded',
        `Manual payment of INR ${payload.amount} recorded.`,
        payload
      );
    } catch (socketErr) {
      logger.warn("Failed to emit offline payment sockets:", socketErr);
    }

    return payment;
  }

  /**
   * Verify an offline payment (Partner verifies customer's cash payment)
   */
  async verifyOfflinePayment(
    paymentId: string,
    partnerId: string,
  ): Promise<IPayment> {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    if (payment.provider !== PAYMENT_PROVIDER.CASH) {
      throw new BadRequestError("Only cash payments can be verified offline");
    }

    if (payment.status === PAYMENT_STATUS.SUCCESS) {
      return payment; // Already verified
    }

    const booking = await BookingModel.findById(payment.bookingId);
    if (!booking) {
      throw new NotFoundError("Associated booking not found");
    }

    const job = await JobModel.findOne({ bookingId: payment.bookingId });
    if (!job || job.partnerId?.toString() !== partnerId) {
      throw new UnauthorizedError(
        "You are not authorized to verify this payment",
      );
    }

    payment.status = PAYMENT_STATUS.SUCCESS;
    payment.paidAt = new Date();
    await payment.save();

    // Deduct commission as outstanding dues, adjusted for any discount borne by the platform
    const baseAmount = payment.baseAmount || payment.amount;
    const discountAmount = payment.discountAmount || 0;
    const commissionAmount = baseAmount * 0.15;
    const duesToAdd = commissionAmount - discountAmount;
    
    await PartnerModel.findByIdAndUpdate(job.partnerId, {
      $inc: { outstandingDues: duesToAdd },
    });

    if (payment.couponCode) {
      const { CouponService } = require("../super-admin/sub-modules/coupons/coupons.service");
      await CouponService.incrementCouponUsage(payment.couponCode);
    }

    try {
      const {
        notificationService,
      } = require("../notification/notification.service");
      const {
        NOTIFICATION_TYPE,
        NOTIFICATION_CATEGORY,
      } = require("../notification/notification.model");

      await notificationService.sendNotification(
        booking.customerId.toString(),
        NOTIFICATION_TYPE.SMS,
        NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
        "Cash Payment Verified",
        `Your offline cash payment of INR ${payment.amount} has been verified by the partner.`,
        {
          bookingId: booking._id.toString(),
          paymentId: payment._id.toString(),
        },
      );
    } catch (notifErr: any) {
      logger.warn(
        "Failed to send offline payment verification notification:",
        notifErr,
      );
    }

    // Emit live updates
    try {
      const payload = {
        bookingId: payment.bookingId,
        paymentId: payment._id,
        status: payment.status,
        amount: payment.amount,
        type: payment.paymentType,
        method: payment.provider,
      };
      emitToUser(
        booking.customerId.toString(),
        "payment_status_update",
        payload,
      );
      if (job && job.partnerId) {
        emitToUser(job.partnerId.toString(), "payment_status_update", payload);
      }
      const notifService = require('../notification/notification.service').notificationService;
      const notifModel = require('../notification/notification.model');

      await notifService.sendToRole(
        'SUPER_ADMIN',
        notifModel.NOTIFICATION_TYPE.IN_APP,
        notifModel.NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
        'Manual Payment Recorded',
        `Manual payment of INR ${payload.amount} recorded.`,
        payload
      );
      await notifService.sendToRole(
        'ACCOUNTS',
        notifModel.NOTIFICATION_TYPE.IN_APP,
        notifModel.NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
        'Manual Payment Recorded',
        `Manual payment of INR ${payload.amount} recorded.`,
        payload
      );
    } catch (socketErr) {
      logger.warn("Failed to emit verify offline payment sockets:", socketErr);
    }

    return payment;
  }

  /**
   * Handle Razorpay webhook notifications
   */
  async handleWebhook(payload: any, signature?: string): Promise<any> {
    const isMock = !env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET;

    if (isMock) {
      logger.info(
        "Razorpay Webhook received in MOCK MODE:",
        JSON.stringify(payload),
      );
      return { success: true, mock: true };
    }

    const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const shasum = crypto.createHmac("sha256", webhookSecret);
      shasum.update(JSON.stringify(payload));
      const expectedSignature = shasum.digest("hex");

      if (expectedSignature !== signature) {
        logger.error("Razorpay Webhook signature verification failed");
        throw new BadRequestError("Invalid webhook signature");
      }
    }

    // Process event
    const event = payload.event;
    if (event === "payment.captured") {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId && paymentId) {
        const payment = await PaymentModel.findOne({
          providerOrderId: orderId,
        });
        if (payment && payment.status !== PAYMENT_STATUS.SUCCESS) {
          payment.status = PAYMENT_STATUS.SUCCESS;
          payment.providerPaymentId = paymentId;
          payment.paidAt = new Date();
          await payment.save();
          logger.info(
            `Webhook successfully processed: Payment ${payment._id} set to SUCCESS`,
          );
        }
      }
    } else if (event === "payment.failed") {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const errorDescription =
        paymentEntity?.error_description || "Payment failed";

      if (orderId) {
        const payment = await PaymentModel.findOne({
          providerOrderId: orderId,
        });
        if (payment && payment.status !== PAYMENT_STATUS.SUCCESS) {
          payment.status = PAYMENT_STATUS.FAILED;
          payment.failureReason = errorDescription;
          await payment.save();
          logger.info(
            `Webhook successfully processed: Payment ${payment._id} set to FAILED`,
          );
        }
      }
    }

    return { success: true };
  }
}

export const paymentService = new PaymentService();
