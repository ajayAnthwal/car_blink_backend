import mongoose from "mongoose";
import { JobModel, IJob } from "./job.model";
import { PartnerModel } from "../../partner.model";
import { BookingModel } from "../../../customer/sub-modules/booking/booking.model";
import { WarrantyModel } from "../../../customer/sub-modules/warranty/warranty.model";
import { NotFoundError } from "../../../../common/errors/NotFoundError";
import { UnauthorizedError } from "../../../../common/errors/UnauthorizedError";
import { ApiError } from "../../../../common/errors/ApiError";
import { BOOKING_STATUS } from "../../../../common/constants/status.constant";
import { ERROR_CODES } from "../../../../common/constants/error-codes.constant";
import { emitToUser } from "../../../../sockets";

export class JobService {
  public static async getMyJobs(
    userId: string,
    query: { status?: string; page?: string; limit?: string },
  ): Promise<{ jobs: IJob[]; total: number; page: number; limit: number }> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError("Partner profile not found");
    }

    const page = Math.max(1, parseInt(query.page || "1", 10));
    const limit = Math.max(1, parseInt(query.limit || "10", 10));
    const skip = (page - 1) * limit;

    const filter: any = { partnerId: partner._id };
    if (query.status) {
      if (query.status === "NOT_STARTED") {
        filter.status = { $in: ["NOT_STARTED", "VERIFIED"] };
      } else {
        filter.status = query.status;
      }
    }
    // Self-healing: Check for any confirmed bookings belonging to this partner that miss a Job document
    try {
      const { BidModel } = require("../bidding/bid.model");
      const partnerBids = await BidModel.find({ partnerId: partner._id }).lean();
      const partnerBidIds = partnerBids.map((b: any) => b._id);
      const partnerBookingIds = partnerBids.map((b: any) => b.bookingId);

      const confirmedBookings = await BookingModel.find({
        $and: [
          {
            $or: [
              { assignedPartnerId: partner._id },
              { acceptedBidId: { $in: partnerBidIds } },
              { _id: { $in: partnerBookingIds } }
            ]
          },
          {
            $or: [
              { status: { $in: [BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.IN_PROGRESS, 'CUSTOMER_ACCEPTED', 'VERIFIED', 'CONFIRMED', 'ASSIGNED'] } },
              { hasPaidAdvance: true },
              { isVerifiedByPartner: true }
            ]
          }
        ]
      }).lean();

      for (const b of confirmedBookings) {
        const existingJob = await JobModel.findOne({ bookingId: b._id });
        if (!existingJob) {
          let matchingBid = partnerBids.find((pb: any) => pb.bookingId.toString() === b._id.toString());
          if (!matchingBid && b.acceptedBidId) {
            matchingBid = await BidModel.findById(b.acceptedBidId);
          }
          const bidIdToUse = matchingBid?._id || b.acceptedBidId || new mongoose.Types.ObjectId();
          const finalAmount = matchingBid?.quotedAmount || 0;

          await JobModel.create({
            bookingId: b._id,
            partnerId: partner._id,
            bidId: bidIdToUse,
            status: b.isVerifiedByPartner ? 'VERIFIED' : 'NOT_STARTED',
            finalAmount,
            createdAt: b.createdAt || new Date(),
            updatedAt: b.updatedAt || new Date()
          });

          await BookingModel.findByIdAndUpdate(b._id, {
            assignedPartnerId: partner._id,
            acceptedBidId: bidIdToUse,
            hasPaidAdvance: true
          });

          if (matchingBid && matchingBid.status !== 'ACCEPTED') {
            await BidModel.findByIdAndUpdate(matchingBid._id, { status: 'ACCEPTED' });
          }
        }
      }
    } catch (syncErr) {
      console.warn("[JobService.getMyJobs] Sync error:", syncErr);
    }

    const [jobs, total] = await Promise.all([
      JobModel.find(filter)
        .populate({
          path: "bookingId",
          populate: [
            { path: "vehicleId" },
            { path: "serviceId" },
            { path: "cityId" },
            { path: "acceptedBidId", select: "quotedAmount notes status" }
          ],
        })
        .populate("bidId", "quotedAmount notes status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      JobModel.countDocuments(filter),
    ]);

    // Fetch payments & invoices for these jobs
    const bookingIds = jobs.map((j) => (j.bookingId?._id || j.bookingId)?.toString()).filter(Boolean);
    const jobIds = jobs.map((j) => j._id.toString()).filter(Boolean);

    const PaymentModel = mongoose.model("Payment");
    const { InvoiceModel } = require("./invoice.model");

    const [payments, invoices] = await Promise.all([
      PaymentModel.find({ bookingId: { $in: bookingIds } }).lean(),
      InvoiceModel.find({
        $or: [
          { jobId: { $in: jobIds } },
          { bookingId: { $in: bookingIds } }
        ]
      }).lean()
    ]);

    const invoicesMap = new Map();
    invoices.forEach((inv: any) => {
      if (inv.jobId) invoicesMap.set(inv.jobId.toString(), inv);
      if (inv.bookingId) invoicesMap.set(inv.bookingId.toString(), inv);
    });

    const jobsWithPayments = jobs.map((job) => {
      const bIdStr = (job.bookingId?._id || job.bookingId)?.toString();
      const jIdStr = job._id.toString();
      const jobPayments = payments.filter(
        (p: any) => p.bookingId.toString() === bIdStr,
      );
      const inv = invoicesMap.get(jIdStr) || invoicesMap.get(bIdStr) || null;
      const invUrl = job.invoiceUrl || inv?.pdfUrl || (inv ? 'ITEMIZED_INVOICE_SUBMITTED' : null);

      return {
        ...job,
        payments: jobPayments,
        invoice: inv,
        invoiceUrl: invUrl,
        hasInvoice: Boolean(invUrl)
      };
    });

    return { jobs: jobsWithPayments as any, total, page, limit };
  }

  public static async verifyCustomerCode(
    userId: string,
    payload: { verificationCode: string; jobId?: string }
  ): Promise<{ job: IJob; booking: any; message: string }> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError("Partner profile not found");
    }

    const inputCode = String(payload.verificationCode || "").trim().toUpperCase();
    if (!inputCode) {
      throw new ApiError(400, "Customer Verification Code is required", ERROR_CODES.VALIDATION_ERROR);
    }

    let targetJob: any = null;

    if (payload.jobId) {
      targetJob = await JobModel.findById(payload.jobId).populate("bookingId");
      if (!targetJob) {
        throw new NotFoundError("Job not found");
      }
      if (targetJob.partnerId.toString() !== partner._id.toString()) {
        throw new UnauthorizedError("You are not authorized to access this job");
      }
    } else {
      // Search for partner's job matching the verification code
      const jobs = await JobModel.find({ partnerId: partner._id }).populate("bookingId");
      targetJob = jobs.find((j: any) => {
        const b = j.bookingId;
        return b && b.verificationCode && String(b.verificationCode).trim().toUpperCase() === inputCode;
      });

      if (!targetJob) {
        // Fallback: Check if there is a matching booking for this partner with this PIN
        const { BidModel } = require("../bidding/bid.model");
        const partnerBids = await BidModel.find({ partnerId: partner._id }).lean();
        const partnerBidIds = partnerBids.map((b: any) => b._id);
        const partnerBookingIds = partnerBids.map((b: any) => b.bookingId);

        const matchingBooking: any = await BookingModel.findOne({
          verificationCode: inputCode,
          $or: [
            { assignedPartnerId: partner._id },
            { acceptedBidId: { $in: partnerBidIds } },
            { forwardedBidIds: { $in: partnerBidIds } },
            { _id: { $in: partnerBookingIds } }
          ]
        });

        if (matchingBooking) {
          const matchingBid = partnerBids.find((pb: any) => pb.bookingId.toString() === matchingBooking._id.toString());
          if (matchingBid) {
            targetJob = await JobModel.create({
              bookingId: matchingBooking._id,
              partnerId: partner._id,
              bidId: matchingBid._id,
              status: 'NOT_STARTED',
              finalAmount: matchingBid.quotedAmount || 0,
            });

            await BookingModel.findByIdAndUpdate(matchingBooking._id, {
              assignedPartnerId: partner._id,
              acceptedBidId: matchingBid._id,
              status: BOOKING_STATUS.ACCEPTED,
              hasPaidAdvance: true
            });

            if (matchingBid.status !== 'ACCEPTED') {
              await BidModel.findByIdAndUpdate(matchingBid._id, { status: 'ACCEPTED' });
            }

            targetJob = await JobModel.findById(targetJob._id).populate("bookingId");
          }
        }
      }
    }

    const logAttempt = async (status: "SUCCESS" | "FAILED", failureReason?: string, bId?: any, jId?: any) => {
      try {
        const { VerificationLogModel } = require("./verification-log.model");
        await VerificationLogModel.create({
          partnerId: partner._id,
          partnerUserId: partner.userId,
          bookingId: bId || (targetJob?.bookingId?._id || targetJob?.bookingId),
          jobId: jId || targetJob?._id,
          attemptedCode: inputCode,
          status,
          failureReason,
          timestamp: new Date()
        });
      } catch (logErr) {}
    };

    if (!targetJob) {
      const reason = "Verification Failed: Invalid Customer Verification Code. No matching job found.";
      await logAttempt("FAILED", reason);
      throw new ApiError(400, reason, ERROR_CODES.VALIDATION_ERROR);
    }

    let booking: any = await BookingModel.findById(targetJob.bookingId?._id || targetJob.bookingId);
    if (!booking) {
      const reason = "Associated booking not found";
      await logAttempt("FAILED", reason, null, targetJob._id);
      throw new NotFoundError(reason);
    }

    // 1. Check if CANCELLED
    if (booking.status === BOOKING_STATUS.CANCELLED) {
      const reason = "Verification Failed: This booking has been CANCELLED by the customer. Service work cannot be started.";
      await logAttempt("FAILED", reason, booking._id, targetJob._id);
      throw new ApiError(400, reason, ERROR_CODES.VALIDATION_ERROR);
    }

    // 2. Check if ALREADY COMPLETED (USED)
    if (booking.status === BOOKING_STATUS.COMPLETED || targetJob.status === "COMPLETED") {
      const reason = "Verification Failed: This Verification PIN has ALREADY BEEN USED for a completed service job.";
      await logAttempt("FAILED", reason, booking._id, targetJob._id);
      throw new ApiError(400, reason, ERROR_CODES.VALIDATION_ERROR);
    }

    // 3. Check PIN correctness
    if (!booking.verificationCode) {
      const reason = "Verification Failed: Customer Handover PIN has not been generated yet. Booking advance payment must be completed first.";
      await logAttempt("FAILED", reason, booking._id, targetJob._id);
      throw new ApiError(400, reason, ERROR_CODES.VALIDATION_ERROR);
    }

    let expectedCode = String(booking.verificationCode || "").trim().toUpperCase();
    if (!expectedCode || inputCode !== expectedCode) {
      // Smart Fallback: Check if this partner has another pending/active job that matches this PIN!
      const allPartnerJobs = await JobModel.find({ partnerId: partner._id }).populate("bookingId");
      const matchedJob = allPartnerJobs.find((j: any) => {
        const b = j.bookingId;
        return b && b.verificationCode && String(b.verificationCode).trim().toUpperCase() === inputCode;
      });

      if (matchedJob) {
        targetJob = matchedJob;
        const altBooking = await BookingModel.findById(targetJob.bookingId?._id || targetJob.bookingId);
        if (altBooking) {
          booking = altBooking;
          expectedCode = String(booking.verificationCode || "").trim().toUpperCase();
        }
      } else {
        const reason = "Verification Failed: Invalid Customer Verification Code. Please check code with customer.";
        await logAttempt("FAILED", reason, booking._id, targetJob._id);
        throw new ApiError(400, reason, ERROR_CODES.VALIDATION_ERROR);
      }
    }

    // Step 1: Mark booking & job as VERIFIED & Work Ready
    booking.isVerifiedByPartner = true;
    booking.verifiedAt = new Date();
    booking.status = "VERIFIED" as any;
    await booking.save();

    targetJob.status = "VERIFIED" as any;
    await targetJob.save();

    // Log SUCCESS attempt
    await logAttempt("SUCCESS", undefined, booking._id, targetJob._id);

    // Broadcast real-time "VERIFIED" socket event to Customer, Executive & Partner
    try {
      const partnerName = partner.businessName || (partner as any).name || "Workshop Partner";
      const verifiedTimestamp = booking.verifiedAt ? new Date(booking.verifiedAt).toISOString() : new Date().toISOString();

      const verificationPayload = {
        bookingId: booking._id.toString(),
        bookingReference: booking._id.toString(),
        jobId: targetJob._id.toString(),
        status: "VERIFIED",
        displayStatus: "Verified / Work Ready",
        verifiedAt: verifiedTimestamp,
        partnerName,
        isVerifiedByPartner: true,
      };

      // Emit to Customer
      emitToUser(booking.customerId.toString(), "booking_status_update", verificationPayload);

      // Emit to assigned Executive
      if (booking.assignedExecutiveId) {
        try {
          const { notificationService } = require("../../../notification/notification.service");
          const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require("../../../notification/notification.model");

          await notificationService.sendNotification(
            booking.assignedExecutiveId.toString(),
            NOTIFICATION_TYPE.IN_APP,
            NOTIFICATION_CATEGORY.JOB_STATUS,
            "Customer Verified",
            `Customer Verification Completed for Booking #${booking._id} by ${partnerName} at ${new Date(verifiedTimestamp).toLocaleTimeString()}. Status: Verified / Work Ready.`,
            verificationPayload
          );
        } catch (e) {}

        emitToUser(booking.assignedExecutiveId.toString(), "job_verified", verificationPayload);
        emitToUser(booking.assignedExecutiveId.toString(), "booking_status_update", verificationPayload);
      }

      // Emit to Partner
      emitToUser(userId, "job_verified", verificationPayload);
    } catch (notifErr: any) {
      // Ignore notification failures
    }

    return {
      job: targetJob,
      booking,
      message: `✓ Customer verified successfully! Booking status updated to "Verified / Work Ready". Click "Start Work" to begin service.`
    };
  }

  public static async startJob(
    userId: string,
    jobId: string,
    verificationCode?: string
  ): Promise<IJob> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError("Partner profile not found");
    }

    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new NotFoundError("Job not found");
    }

    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError("You are not authorized to start this job");
    }

    const booking = await BookingModel.findById(job.bookingId);
    if (!booking) {
      throw new NotFoundError("Associated booking not found");
    }

    // MANDATORY GATE: Check if customer verification has occurred
    if (!booking.isVerifiedByPartner && (job.status as string) !== "VERIFIED") {
      if (verificationCode) {
        await this.verifyCustomerCode(userId, { jobId, verificationCode });
      } else {
        throw new ApiError(
          400,
          "Mandatory Verification Gate: Verification is required before starting work. Please enter and verify the Customer Verification PIN first.",
          ERROR_CODES.VALIDATION_ERROR
        );
      }
    }

    // Step 2: Transition to IN_PROGRESS / Work Started
    booking.status = BOOKING_STATUS.IN_PROGRESS;
    await booking.save();

    job.status = "IN_PROGRESS";
    job.startedAt = job.startedAt || new Date();
    await job.save();

    // Real-time notification & Socket broadcast to Customer and Executive
    try {
      const { notificationService } = require("../../../notification/notification.service");
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require("../../../notification/notification.model");

      await notificationService.sendNotification(
        booking.customerId.toString(),
        NOTIFICATION_TYPE.SMS,
        NOTIFICATION_CATEGORY.JOB_STATUS,
        "Work Started",
        `Your car service has officially started! Live status: Work Started.`,
        { bookingId: booking._id.toString(), jobId: job._id.toString() },
      );

      // Emit live socket event to customer & executive
      emitToUser(booking.customerId.toString(), "booking_status_update", {
        bookingId: booking._id.toString(),
        status: BOOKING_STATUS.IN_PROGRESS,
        displayStatus: "Work Started"
      });

      // Emit to partner dashboard
      emitToUser(userId, "job_started", {
        jobId: job._id.toString(),
        bookingId: booking._id.toString(),
        status: "IN_PROGRESS"
      });
    } catch (notifErr: any) {
      // Ignore notification failures
    }

    return job;
  }

  public static async completeJob(
    userId: string,
    jobId: string,
    data?: { finalAmount?: number; invoiceUrl?: string },
  ): Promise<IJob> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError("Partner profile not found");
    }

    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new NotFoundError("Job not found");
    }

    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError(
        "You are not authorized to complete this job",
      );
    }

    if (job.status !== "IN_PROGRESS") {
      throw new ApiError(
        400,
        `Cannot complete job in ${job.status} status`,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    const { InvoiceModel } = require('./invoice.model');
    const existingInvoice = await InvoiceModel.findOne({
      $or: [
        { jobId: job._id.toString() },
        { jobId: job._id },
        { bookingId: (job.bookingId?._id || job.bookingId)?.toString() }
      ]
    });

    if (!data?.invoiceUrl && !job.invoiceUrl && !existingInvoice) {
      throw new ApiError(
        400,
        "Invoice document or itemized bill is mandatory to complete the job. Please submit an itemized invoice or upload a document.",
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    // Calculate Gross Amount (Final Amount)
    const BidModel = mongoose.model("Bid");
    const bid = (await BidModel.findById(job.bidId)) as any;
    const baseQuotedAmount = bid ? bid.quotedAmount : job.finalAmount || 0;

    const approvedExtensionsCost = job.jobExtensions
      .filter((ext) => ext.status === "APPROVED")
      .reduce((sum, ext) => sum + ext.cost, 0);

    const calculatedFinalAmount = baseQuotedAmount + approvedExtensionsCost;

    // Fetch Advance Paid to calculate Remaining Amount for Invoice/Notification
    const PaymentModel = mongoose.model("Payment");
    const advancePayments = await PaymentModel.find({
      bookingId: job.bookingId,
      paymentType: "ADVANCE",
      status: "SUCCESS",
    });
    const totalAdvancePaid = advancePayments.reduce(
      (sum, p) => sum + p.amount,
      0,
    );
    const remainingAmountToPay = Math.max(
      0,
      calculatedFinalAmount - totalAdvancePaid,
    );

    // Update Job status
    job.status = "COMPLETED";
    job.completedAt = new Date();
    job.finalAmount = calculatedFinalAmount;
    if (data?.invoiceUrl) {
      job.invoiceUrl = data.invoiceUrl;
    }
    await job.save();

    // Sync status and uploaded photos with Booking
    const updatedBooking = await BookingModel.findByIdAndUpdate(job.bookingId, {
      $set: { 
        status: BOOKING_STATUS.COMPLETED,
        ...(job.beforePhotos?.length ? { beforePhotos: job.beforePhotos } : {}),
        ...(job.afterPhotos?.length ? { afterPhotos: job.afterPhotos } : {})
      },
    }, { new: true });

    // Notify Executive Team about job completion & uploaded artifacts
    try {
      const { notificationService } = require('../../../notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');
      await notificationService.sendToRole(
        'EXECUTIVE',
        NOTIFICATION_TYPE.IN_APP,
        NOTIFICATION_CATEGORY.BOOKING_UPDATE,
        'Partner Completed Job ✓',
        `Partner has completed job/booking #${job.bookingId.toString().slice(-8).toUpperCase()} and uploaded completion photos & invoice.`,
        { jobId: job._id.toString(), bookingId: job.bookingId.toString() }
      );
    } catch (e) {}

    // Process Wallet Commission
    if (updatedBooking) {
      const paymentMode = updatedBooking.paymentMode || 'ONLINE'; // default to ONLINE if not set
      const { WalletService } = require('../../../wallet/wallet.service');
      await WalletService.processBookingCommission(
        job.partnerId.toString(),
        job.bookingId.toString(),
        calculatedFinalAmount,
        paymentMode
      );
    }

    // Automate Savings and Rewards
    if (updatedBooking && updatedBooking.customerId) {
      const UserModel = mongoose.model("User");
      
      // Calculate 10% Savings (market rate vs CarBlink rate) and 2% Reward Points
      const savingsToAdd = calculatedFinalAmount * 0.10;
      const pointsToAdd = Math.floor(calculatedFinalAmount * 0.02);

      await UserModel.findByIdAndUpdate(updatedBooking.customerId, {
        $inc: {
          totalSavings: savingsToAdd,
          rewardPoints: pointsToAdd
        }
      });
    }

    // Notify customer that service is completed
    try {
      const booking = await BookingModel.findById(job.bookingId);
      if (booking) {
        const {
          notificationService,
        } = require("../../../notification/notification.service");
        const {
          NOTIFICATION_TYPE,
          NOTIFICATION_CATEGORY,
        } = require("../../../notification/notification.model");
        const { logger } = require("../../../../config/logger.config");

        // SMS
        await notificationService.sendNotification(
          booking.customerId.toString(),
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.JOB_STATUS,
          "Service Completed",
          `Your car cleaning service is completed. The remaining balance to pay is INR ${remainingAmountToPay}. Please review and pay.`,
          {
            bookingId: booking._id.toString(),
            jobId: job._id.toString(),
            remainingAmount: remainingAmountToPay,
          },
        );

        // EMAIL
        await notificationService.sendNotification(
          booking.customerId.toString(),
          NOTIFICATION_TYPE.EMAIL,
          NOTIFICATION_CATEGORY.JOB_STATUS,
          "Service Completed",
          `Your car service has been completed. The final invoice remaining amount is INR ${remainingAmountToPay}. Please log in to pay and rate the service.`,
          {
            bookingId: booking._id.toString(),
            jobId: job._id.toString(),
            remainingAmount: remainingAmountToPay,
          },
        );

        // Emit live socket event to customer
        emitToUser(booking.customerId.toString(), "booking_status_update", {
          bookingId: booking._id.toString(),
          status: BOOKING_STATUS.COMPLETED,
        });

        // Emit to partner so their dashboard updates in real-time (no page refresh needed)
        emitToUser(userId, "job_completed", {
          jobId: job._id.toString(),
          bookingId: booking._id.toString(),
        });
      }
    } catch (notifErr: any) {
      const { logger } = require("../../../../config/logger.config");
      logger.warn("Failed to send job completion notifications:", notifErr);
    }

    return job;
  }

  public static async uploadJobInvoice(
    userId: string,
    jobId: string,
    invoiceUrl: string,
  ): Promise<IJob> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError("Partner profile not found");
    }

    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new NotFoundError("Job not found");
    }

    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError(
        "You are not authorized to upload invoice for this job",
      );
    }

    job.invoiceUrl = invoiceUrl;
    return job.save();
  }

  public static async uploadJobPhotos(
    userId: string,
    jobId: string,
    photos: string[],
    type: "before" | "after",
  ): Promise<IJob> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError("Partner profile not found");
    }

    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new NotFoundError("Job not found");
    }

    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError(
        "You are not authorized to upload photos for this job",
      );
    }

    console.log(
      `uploadJobPhotos triggered with type: ${type}, photos: ${photos}`,
    );

    const updateField =
      type?.toLowerCase() === "before" ? "beforePhotos" : "afterPhotos";

    const updatedJob = await JobModel.findByIdAndUpdate(
      jobId,
      { $push: { [updateField]: { $each: photos } } },
      { new: true },
    );

    if (!updatedJob) throw new NotFoundError("Job not found after update");

    // Also sync photos onto Booking document so Executive/Admin lead queries immediately reflect uploaded photos
    if (updatedJob.bookingId) {
      await BookingModel.findByIdAndUpdate(updatedJob.bookingId, {
        $push: { [updateField]: { $each: photos } }
      });
    }

    // Notify Executives
    try {
      const { notificationService } = require('../../../notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');
      await notificationService.sendToRole(
        'EXECUTIVE',
        NOTIFICATION_TYPE.IN_APP,
        NOTIFICATION_CATEGORY.BOOKING_UPDATE,
        'Partner Uploaded Vehicle Photos 📷',
        `Partner uploaded ${photos.length} ${type.toLowerCase()} service photo(s) for job/booking #${(updatedJob.bookingId || jobId).toString().slice(-8).toUpperCase()}.`,
        { jobId: updatedJob._id.toString(), bookingId: (updatedJob.bookingId || '').toString() }
      );
    } catch (e) {}

    return updatedJob as any;
  }

  public static async deleteJobPhoto(
    partnerId: string,
    jobId: string,
    photoUrl: string,
    type: "BEFORE" | "AFTER",
  ): Promise<any> {
    const partner = await PartnerModel.findOne({ userId: partnerId });
    if (!partner) throw new NotFoundError("Partner not found");

    const job = await JobModel.findById(jobId);
    if (!job) throw new NotFoundError("Job not found");

    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError(
        "You are not authorized to modify photos for this job",
      );
    }

    const updateField =
      type?.toLowerCase() === "before" ? "beforePhotos" : "afterPhotos";

    const updatedJob = await JobModel.findByIdAndUpdate(
      jobId,
      { $pull: { [updateField]: photoUrl } },
      { new: true },
    );

    return updatedJob;
  }

  public static async uploadJobWarranty(
    userId: string,
    jobId: string,
    data: { warrantyPeriodMonths: number; warrantyDocumentUrl?: string },
  ): Promise<any> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError("Partner profile not found");
    }

    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new NotFoundError("Job not found");
    }

    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError(
        "You are not authorized to issue warranty for this job",
      );
    }

    if (job.status !== "COMPLETED") {
      throw new ApiError(
        400,
        "Warranty can only be issued for completed jobs",
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    // Get related booking details to acquire customerId
    const booking = await BookingModel.findById(job.bookingId);
    if (!booking) {
      throw new NotFoundError("Related booking not found");
    }

    // Create the Warranty document
    const warranty = await WarrantyModel.create({
      bookingId: job.bookingId,
      customerId: booking.customerId,
      partnerId: job.partnerId,
      warrantyPeriodMonths: data.warrantyPeriodMonths,
      warrantyDocumentUrl: data.warrantyDocumentUrl,
      startDate: new Date(),
      status: "ACTIVE",
    });

    // Notify customer that warranty is issued
    try {
      const {
        notificationService,
      } = require("../../../notification/notification.service");
      const {
        NOTIFICATION_TYPE,
        NOTIFICATION_CATEGORY,
      } = require("../../../notification/notification.model");
      const { logger } = require("../../../../config/logger.config");

      await notificationService.sendNotification(
        booking.customerId.toString(),
        NOTIFICATION_TYPE.EMAIL,
        NOTIFICATION_CATEGORY.GENERAL,
        "Warranty Issued",
        `A warranty of ${data.warrantyPeriodMonths} months has been issued for your booking ${job.bookingId}.`,
        {
          bookingId: job.bookingId.toString(),
          warrantyId: warranty._id.toString(),
        },
      );
    } catch (notifErr: any) {
      const { logger } = require("../../../../config/logger.config");
      logger.warn("Failed to send warranty notification:", notifErr);
    }
  }

  public static async requestJobExtension(
    userId: string,
    jobId: string,
    data: { partName: string; cost: number },
  ): Promise<IJob> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) throw new NotFoundError("Partner profile not found");

    const job = await JobModel.findById(jobId);
    if (!job) throw new NotFoundError("Job not found");
    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError("Not authorized");
    }

    job.jobExtensions.push({
      partName: data.partName,
      cost: data.cost,
      status: "PENDING",
    });

    await job.save();

    // Notify customer about extension request
    try {
      const booking = await BookingModel.findById(job.bookingId);
      if (booking) {
        const {
          notificationService,
        } = require("../../../notification/notification.service");
        const {
          NOTIFICATION_TYPE,
          NOTIFICATION_CATEGORY,
        } = require("../../../notification/notification.model");
        await notificationService.sendNotification(
          booking.customerId.toString(),
          NOTIFICATION_TYPE.EMAIL,
          NOTIFICATION_CATEGORY.GENERAL,
          "Approval Needed for Extra Part",
          `The garage has requested an extension for part: ${data.partName} costing ${data.cost}. Please approve or reject.`,
          { bookingId: booking._id.toString() },
        );
        emitToUser(booking.customerId.toString(), "booking_updated", {
          bookingId: booking._id.toString(),
        });
      }
    } catch (e) {
      console.warn("Failed to send extension notification", e);
    }

    return job;
  }

  public static async assignStaff(
    userId: string,
    jobId: string,
    staffId: string,
  ): Promise<IJob> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) throw new NotFoundError("Partner profile not found");

    const job = await JobModel.findById(jobId);
    if (!job) throw new NotFoundError("Job not found");
    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError("Not authorized");
    }

    // Assign staff
    job.staffId = staffId as any;
    return job.save();
  }
}
export default JobService;
