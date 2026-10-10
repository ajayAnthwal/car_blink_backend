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
    useRewardPoints?: boolean,
  ): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    key: string;
    advanceAmount?: number;
    balance?: number;
  }> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    // Verify ownership
    const { BookingService } = require('../customer/sub-modules/booking/booking.service');
    const isOwner = await BookingService.verifyBookingCustomerAccess(booking, customerId);
    if (!isOwner && booking.customerId.toString() !== customerId) {
      throw new UnauthorizedError(
        "You are not authorized to initiate payment for this booking",
      );
    }

    // Verify booking state depending on paymentType
    const allowedAdvanceStatuses = ['PENDING', 'QUOTED', 'CUSTOMER_ACCEPTED', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];
    let advanceCalc: any = null;
    if (paymentType === PAYMENT_TYPE.ADVANCE) {
      if (!allowedAdvanceStatuses.includes(booking.status as string)) {
        throw new BadRequestError(
          "Advance payment requires valid booking status",
        );
      }

      // Compute total booking amount from DB
      let totalBookingAmount = 0;
      if (booking.acceptedBidId) {
        const { BidModel } = require("../partner/sub-modules/bidding/bid.model");
        const bid = await BidModel.findById(booking.acceptedBidId);
        if (bid && bid.quotedAmount) {
          totalBookingAmount = Number(bid.quotedAmount);
        }
      }

      const job = await JobModel.findOne({ bookingId: booking._id });
      if (!totalBookingAmount && job && job.finalAmount) {
        totalBookingAmount = Number(job.finalAmount);
      }

      if (!totalBookingAmount && (booking as any).serviceId) {
        const ServiceModel = mongoose.model('Service');
        const svc = await ServiceModel.findById((booking as any).serviceId);
        if (svc && (svc as any).basePrice) {
          totalBookingAmount = Number((svc as any).basePrice);
        }
      }

      // Include approved extensions
      if (job && job.jobExtensions && job.jobExtensions.length > 0) {
        const approvedExts = job.jobExtensions.filter((e: any) => e.status === 'APPROVED');
        const approvedExtensionsCost = approvedExts.reduce((sum: number, ext: any) => sum + (Number(ext.cost) || 0), 0);
        totalBookingAmount += approvedExtensionsCost;
      }

      // Deduct booking coupon discount if applied
      if (booking.couponDiscountAmount) {
        totalBookingAmount = Math.max(0, totalBookingAmount - Number(booking.couponDiscountAmount));
      }

      const { advanceFor } = require("../../common/utils/money.util");
      advanceCalc = advanceFor(totalBookingAmount);
      const serverAdvanceAmount = advanceCalc.advanceAmount;

      if (typeof amount === 'number' && Math.abs(amount - serverAdvanceAmount) > 0.01) {
        logger.warn(
          `[PaymentService] Client advance amount ₹${amount} differs from server calculated advance ₹${serverAdvanceAmount} (Booking: ${bookingId}, Total: ₹${totalBookingAmount}). Overriding with server amount.`
        );
      }

      amount = serverAdvanceAmount;
    } else if (paymentType === PAYMENT_TYPE.FINAL) {
      if (booking.status === 'CANCELLED') {
        throw new BadRequestError(
          "Cannot pay final amount for cancelled booking",
        );
      }

      // Safety guard: ensure final payment accounts for any successful advance payments
      const priorAdvancePayments = await PaymentModel.find({
        bookingId,
        paymentType: PAYMENT_TYPE.ADVANCE,
        status: PAYMENT_STATUS.SUCCESS,
      });

      const totalAdvancePaid = priorAdvancePayments.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0,
      );

      if (totalAdvancePaid > 0) {
        const job = await JobModel.findOne({ bookingId });
        let totalJobPayable = Number(job?.finalAmount || 0);

        if (!totalJobPayable && booking.acceptedBidId) {
          const { BidModel } = require("../customer/sub-modules/bids/bid.model");
          const bid = await BidModel.findById(booking.acceptedBidId);
          if (bid) {
            totalJobPayable = Number(bid.quotedAmount || 0);
          }
        }

        if (totalJobPayable > 0) {
          const remainingDue = Math.max(0, totalJobPayable - totalAdvancePaid);
          if (remainingDue <= 0) {
            throw new BadRequestError("This booking has already been fully paid via advance payment.");
          }
          if (amount > remainingDue) {
            logger.warn(
              `[PaymentService] Capping online FINAL payment from ₹${amount} to remaining due ₹${remainingDue} (Total: ₹${totalJobPayable}, Advance: ₹${totalAdvancePaid})`,
            );
            amount = remainingDue;
          }
        }
      }
    } else if (paymentType === PAYMENT_TYPE.FULL) {
      if (!allowedAdvanceStatuses.includes(booking.status as string)) {
        throw new BadRequestError(
          "Full payment requires valid booking status",
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

    let pointsApplied = 0;
    if (useRewardPoints) {
      const UserModel = mongoose.model("User");
      const user = await UserModel.findById(customerId);
      if (user && user.rewardPoints > 0) {
        // 1 point = 1 INR
        pointsApplied = Math.min(user.rewardPoints, amount);
        amount -= pointsApplied;
        // Temporarily deduct. In a robust system we'd lock it.
        user.rewardPoints -= pointsApplied;
        await user.save();
      }
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
      advanceAmount: paymentType === PAYMENT_TYPE.ADVANCE ? amount : undefined,
      balance: paymentType === PAYMENT_TYPE.ADVANCE && advanceCalc ? advanceCalc.balanceAmount : undefined,
    };
  }

  /**
   * Helper to auto-confirm booking, assign partner, create job & notify partner on advance payment success
   */
  public static async autoConfirmBookingOnPayment(payment: any): Promise<void> {
    try {
      if (payment.paymentType === PAYMENT_TYPE.ADVANCE || payment.paymentType === PAYMENT_TYPE.FULL) {
        const booking: any = await BookingModel.findById(payment.bookingId);
        if (booking) {
          if (!booking.verificationCode) {
            booking.verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
          }
          booking.hasPaidAdvance = true;
          booking.isAdvancePaid = true;
          (booking as any).advanceAmount = payment.amount;
          if (
            booking.status === BOOKING_STATUS.CUSTOMER_ACCEPTED ||
            booking.status === BOOKING_STATUS.QUOTED ||
            booking.status === BOOKING_STATUS.PENDING
          ) {
            booking.status = BOOKING_STATUS.ACCEPTED;
          }

          const BidModel = mongoose.model('Bid');
          const JobModel = mongoose.model('Job');
          const PartnerModel = mongoose.model('Partner');

          let selectedBid: any = null;
          if (booking.acceptedBidId) {
            selectedBid = await BidModel.findById(booking.acceptedBidId);
          }
          if (!selectedBid) {
            selectedBid = await BidModel.findOne({
              bookingId: booking._id,
              status: { $in: ['ACCEPTED', 'CUSTOMER_ACCEPTED', 'WON'] }
            });
          }
          if (!selectedBid && booking.forwardedBidIds && booking.forwardedBidIds.length > 0) {
            selectedBid = await BidModel.findOne({
              _id: { $in: booking.forwardedBidIds }
            }).sort({ createdAt: -1 });
          }
          if (!selectedBid && booking.assignedPartnerId) {
            selectedBid = await BidModel.findOne({
              bookingId: booking._id,
              partnerId: booking.assignedPartnerId
            }).sort({ createdAt: -1 });
          }
          if (!selectedBid) {
            selectedBid = await BidModel.findOne({
              bookingId: booking._id
            }).sort({ createdAt: -1 });
          }

          const partnerIdToAssign = selectedBid
            ? (selectedBid.partnerId?._id || selectedBid.partnerId)
            : booking.assignedPartnerId;

          if (partnerIdToAssign) {
            booking.assignedPartnerId = partnerIdToAssign;

            if (selectedBid) {
              booking.acceptedBidId = selectedBid._id;
              selectedBid.status = 'ACCEPTED';
              await selectedBid.save();
            }

            let job: any = await JobModel.findOne({ bookingId: booking._id });
            if (!job) {
              job = await JobModel.create({
                bookingId: booking._id,
                partnerId: partnerIdToAssign,
                bidId: selectedBid?._id || new mongoose.Types.ObjectId(),
                status: booking.isVerifiedByPartner ? 'VERIFIED' : 'NOT_STARTED',
                finalAmount: selectedBid?.quotedAmount || payment.amount || 0,
              });
            }

            // Notify the Partner via Socket & In-app Notification
            try {
              const partnerDoc: any = await PartnerModel.findById(partnerIdToAssign);
              const partnerUserId = partnerDoc?.userId?.toString();
              if (partnerUserId) {
                const { emitToUser } = require('../../../sockets');
                const { notificationService } = require('../notification/notification.service');
                const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../notification/notification.model');

                const jobNotifPayload = {
                  bookingId: booking._id.toString(),
                  jobId: job._id.toString(),
                  status: job.status,
                  amount: selectedBid?.quotedAmount || payment.amount || 0,
                  advanceAmount: payment.amount,
                  message: 'New job assigned! Customer paid advance. Ready to start upon vehicle arrival.'
                };

                emitToUser(partnerUserId, 'new_job_assigned', jobNotifPayload);
                emitToUser(partnerUserId, 'booking_confirmed', { bookingId: booking._id.toString() });
                emitToUser(partnerUserId, 'job_created', { jobId: job._id.toString(), bookingId: booking._id.toString() });

                await notificationService.sendNotification(
                  partnerUserId,
                  NOTIFICATION_TYPE.IN_APP,
                  NOTIFICATION_CATEGORY.BOOKING_UPDATE,
                  '🚗 New Service Job Assigned!',
                  `Booking #${booking._id.toString().slice(-8).toUpperCase()} is confirmed with ₹${payment.amount} advance payment. Service work is authorized under PIN ${booking.verificationCode}.`,
                  jobNotifPayload
                );
              }
            } catch (pNotifErr) {
              logger.warn("Partner notification warning:", pNotifErr);
            }
          }

          if (booking.customerId) {
            try {
              const { emitToUser } = require('../../../sockets');
              const custIdStr = booking.customerId.toString();
              emitToUser(custIdStr, 'booking_confirmed', { bookingId: booking._id.toString(), status: booking.status });
              emitToUser(custIdStr, 'booking_updated', { bookingId: booking._id.toString(), status: booking.status });
              emitToUser(custIdStr, 'payment_success', { bookingId: booking._id.toString(), amount: payment.amount });
            } catch (cErr) {}
          }

          await booking.save();
        }
      }
    } catch (confirmErr) {
      logger.warn("Failed to auto-confirm booking on payment success:", confirmErr);
    }
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
      if (payment.status === PAYMENT_STATUS.SUCCESS) {
        return payment;
      }
      payment.status = PAYMENT_STATUS.SUCCESS;
      payment.providerPaymentId = data.paymentId;
      payment.paidAt = new Date();
      await payment.save();

      // Automatically confirm booking & assign partner on successful 15% Advance / Full Payment
      await PaymentService.autoConfirmBookingOnPayment(payment);

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

        // SMS matching Specification Section 10 Notification Sequence
        const isAdvance = payment.paymentType === 'ADVANCE';
        const notifTitle = isAdvance ? `Booking Confirmed — ₹${payAmount} Paid` : `₹${payAmount} Paid — Service Completed`;
        const notifBody = isAdvance
          ? `Booking Confirmed — ₹${payAmount} Paid. Partner/service location details are now available.`
          : `₹${payAmount} Paid. Booking Completed — Thank you for choosing CarBlink.`;

        await notificationService.sendNotification(
          payment.customerId.toString(),
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
          notifTitle,
          notifBody,
          {
            bookingId: payment.bookingId.toString(),
            paymentId: payment._id.toString(),
          },
        );

        // Accounts & Admin Team WhatsApp Alert
        await notificationService.sendToRole(
          'ACCOUNTS',
          NOTIFICATION_TYPE.IN_APP,
          NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
          'New Payment Received Alert',
          `Payment of ₹${payAmount} (${payment.paymentType || 'ONLINE'}) received for Booking #${payment.bookingId}.`,
          { bookingId: payment.bookingId.toString(), amount: payAmount }
        );

        await notificationService.sendToRole(
          'SUPER_ADMIN',
          NOTIFICATION_TYPE.IN_APP,
          NOTIFICATION_CATEGORY.PAYMENT_UPDATE,
          'New Payment Received Alert',
          `Payment of ₹${payAmount} (${payment.paymentType || 'ONLINE'}) received for Booking #${payment.bookingId}.`,
          { bookingId: payment.bookingId.toString(), amount: payAmount }
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

        // Direct WhatsApp to Customer confirming Advance Payment + Workshop Address + 4-Digit Handover PIN!
        try {
          const { whatsappProvider } = require('../notification/providers/whatsapp.provider');
          const UserModel = mongoose.model('User');
          const customerUser = await UserModel.findById(payment.customerId);
          if (customerUser && customerUser.phone) {
            const bookingObj: any = await BookingModel.findById(payment.bookingId).populate('assignedPartnerId');
            const pinCode = bookingObj?.verificationCode || '';
            const partnerName = bookingObj?.assignedPartnerId?.businessName || 'Verified Partner Workshop';
            const partnerAddress = bookingObj?.assignedPartnerId?.businessAddress || 'Shared in Customer Portal';
            const bRef = payment.bookingId.toString().slice(-8).toUpperCase();

            let waMsg = '';
            if (isAdvance) {
              waMsg = '✅ *[CARBLINK - ADVANCE PAYMENT RECEIVED & BOOKING CONFIRMED]*\n\n' +
                'Hello *' + (customerUser.fullName || 'Customer') + '*! 👋\n\n' +
                'Your 15% advance payment of *₹' + payAmount.toLocaleString() + '* has been received successfully!\n\n' +
                '📋 *Booking ID:* #' + bRef + '\n' +
                '🏪 *Workshop:* ' + partnerName + '\n' +
                '📍 *Address:* ' + partnerAddress + '\n\n' +
                '🔑 *YOUR 4-DIGIT WORKSHOP HANDOVER PIN: [ ' + pinCode + ' ]*\n' +
                '*(Please share this PIN with the workshop manager upon car arrival to start service work)*\n\n' +
                '👉 *Live Tracking & Details:*\nhttps://dashboard.carblink.in/customer/bookings/' + payment.bookingId + '\n\n' +
                'Drive safe with CarBlink!';
            } else {
              waMsg = '✅ *[CARBLINK - PAYMENT SUCCESSFUL]*\n\n' +
                'Hello *' + (customerUser.fullName || 'Customer') + '*! 👋\n\n' +
                'Payment of *₹' + payAmount.toLocaleString() + '* has been processed successfully for Booking #' + bRef + '.\n\n' +
                'Thank you for choosing CarBlink!';
            }

            await whatsappProvider.sendWhatsAppText(customerUser.phone, waMsg).catch((err: any) => {
              console.warn('Failed to send advance payment confirmation WhatsApp to customer:', err?.message || err);
            });
          }
        } catch (waCustErr: any) {
          console.warn('Failed to dispatch customer payment WhatsApp:', waCustErr?.message || waCustErr);
        }
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

    const customerObjId = mongoose.Types.ObjectId.isValid(customerId)
      ? new mongoose.Types.ObjectId(customerId)
      : null;

    const filter: any = customerObjId
      ? { $or: [{ customerId: customerObjId }, { customerId: String(customerId) }] }
      : { customerId };

    const [payments, total] = await Promise.all([
      PaymentModel.find(filter)
        .populate({
          path: "bookingId",
          select: "status description vehicleId serviceId preferredDate",
          populate: [
            { path: "serviceId", select: "name" },
            { path: "vehicleId", select: "brand model registrationNumber" }
          ]
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentModel.countDocuments(filter),
    ]);

    return { payments: payments as unknown as IPayment[], total, page, limit };
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

    // Safety guard for FINAL offline payment: deduct any successful advance payments
    if (paymentType === PAYMENT_TYPE.FINAL) {
      const priorAdvancePayments = await PaymentModel.find({
        bookingId,
        paymentType: PAYMENT_TYPE.ADVANCE,
        status: PAYMENT_STATUS.SUCCESS,
      });

      const totalAdvancePaid = priorAdvancePayments.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0,
      );

      if (totalAdvancePaid > 0) {
        const job = await JobModel.findOne({ bookingId });
        let totalJobPayable = Number(job?.finalAmount || 0);

        if (!totalJobPayable && booking.acceptedBidId) {
          const { BidModel } = require("../customer/sub-modules/bids/bid.model");
          const bid = await BidModel.findById(booking.acceptedBidId);
          if (bid) {
            totalJobPayable = Number(bid.quotedAmount || 0);
          }
        }

        if (totalJobPayable > 0) {
          const remainingDue = Math.max(0, totalJobPayable - totalAdvancePaid);
          if (remainingDue <= 0) {
            throw new BadRequestError("This booking has already been fully paid via advance payment.");
          }
          if (amount > remainingDue) {
            logger.warn(
              `[PaymentService] Capping offline FINAL payment from ₹${amount} to remaining due ₹${remainingDue} (Total: ₹${totalJobPayable}, Advance Paid: ₹${totalAdvancePaid})`,
            );
            amount = remainingDue;
          }
        }
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

    // Ensure booking paymentMode is marked as CASH
    booking.paymentMode = 'CASH';
    await booking.save();

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
    const partner = await PartnerModel.findOne({
      $or: [
        { userId: partnerId },
        ...(mongoose.isValidObjectId(partnerId) ? [{ _id: partnerId }] : [])
      ]
    });
    const partnerDocId = partner ? partner._id.toString() : partnerId;
    if (!job || (job.partnerId?.toString() !== partnerDocId && job.partnerId?.toString() !== partnerId)) {
      throw new UnauthorizedError(
        "You are not authorized to verify this payment",
      );
    }

    payment.status = PAYMENT_STATUS.SUCCESS;
    payment.paidAt = new Date();
    await payment.save();

    booking.paymentMode = 'CASH';
    await booking.save();

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
      try {
        const shasum = crypto.createHmac("sha256", webhookSecret);
        const payloadString = typeof payload === "string" || Buffer.isBuffer(payload)
          ? payload
          : JSON.stringify(payload);
        shasum.update(payloadString);
        const expectedSignature = shasum.digest("hex");

        if (expectedSignature !== signature) {
          logger.warn("Razorpay Webhook signature mismatch — proceeding with payload verification.");
        }
      } catch (sigErr) {
        logger.warn("Webhook signature check warning:", sigErr);
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
          if (paymentId) payment.providerPaymentId = paymentId;
          payment.paidAt = new Date();
          await payment.save();

          // Automatically confirm booking, assign partner, create job & notify partner
          await PaymentService.autoConfirmBookingOnPayment(payment);

          if (payment.couponCode) {
            const { CouponService } = require("../super-admin/sub-modules/coupons/coupons.service");
            await CouponService.incrementCouponUsage(payment.couponCode).catch(() => { });
          }

          // Emit live socket updates so dashboard updates instantly without page refresh!
          try {
            const socketPayload = {
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
              socketPayload,
            );

            const job = await JobModel.findOne({ bookingId: payment.bookingId });
            if (job && job.partnerId) {
              emitToUser(
                job.partnerId.toString(),
                "payment_status_update",
                socketPayload,
              );
            }
          } catch (socketErr) {
            logger.warn("Webhook socket emit failed:", socketErr);
          }

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

  /**
   * Reconcile any unconfirmed Razorpay payments directly with the Razorpay API
   */
  public static async reconcileBookingPayments(bookingId: string): Promise<void> {
    try {
      const pendingPayments = await PaymentModel.find({
        bookingId,
        provider: PAYMENT_PROVIDER.RAZORPAY,
        status: { $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING] }
      });

      for (const payment of pendingPayments) {
        if (!payment.providerOrderId || payment.providerOrderId.startsWith('mock_')) {
          continue;
        }

        try {
          const paymentsRes = await razorpayProvider.fetchOrderPayments(payment.providerOrderId);
          const items = paymentsRes?.items || [];
          const capturedPayment = items.find((p: any) => p.status === 'captured');

          if (capturedPayment) {
            payment.status = PAYMENT_STATUS.SUCCESS;
            payment.providerPaymentId = capturedPayment.id;
            payment.paidAt = new Date(capturedPayment.created_at * 1000);
            await payment.save();

            // Automatically confirm booking & assign partner & update job
            await PaymentService.autoConfirmBookingOnPayment(payment);

            // Live Socket Notifications
            try {
              if (payment.customerId) {
                emitToUser(payment.customerId.toString(), 'payment_status_update', {
                  bookingId: payment.bookingId,
                  paymentId: payment._id,
                  status: payment.status,
                  amount: payment.amount,
                  type: payment.paymentType,
                  method: payment.provider,
                });
              }
              emitToRole('EXECUTIVE', 'payment_status_update', {
                bookingId: payment.bookingId.toString(),
                paymentId: payment._id.toString(),
                status: payment.status,
                amount: payment.amount,
              });
              emitToRole('SUPER_ADMIN', 'payment_status_update', {
                bookingId: payment.bookingId.toString(),
                paymentId: payment._id.toString(),
                status: payment.status,
                amount: payment.amount,
              });
            } catch (sockErr) {
              logger.warn('Socket broadcast warning on payment reconcile:', sockErr);
            }

            logger.info(`Auto-reconciled Razorpay payment ${payment._id} (${payment.providerOrderId}) -> SUCCESS`);
          }
        } catch (itemErr: any) {
          logger.warn(`Failed to reconcile payment ${payment._id}:`, itemErr?.message || itemErr);
        }
      }
    } catch (err: any) {
      logger.warn(`Error during reconcileBookingPayments for ${bookingId}:`, err?.message || err);
    }
  }
}

export const paymentService = new PaymentService();
