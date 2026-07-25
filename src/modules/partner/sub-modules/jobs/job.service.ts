import { JobModel, IJob } from './job.model';
import { PartnerModel } from '../../partner.model';
import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';
import { WarrantyModel } from '../../../customer/sub-modules/warranty/warranty.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { UnauthorizedError } from '../../../../common/errors/UnauthorizedError';
import { ApiError } from '../../../../common/errors/ApiError';
import { BOOKING_STATUS } from '../../../../common/constants/status.constant';
import { ERROR_CODES } from '../../../../common/constants/error-codes.constant';
import { emitToUser } from '../../../../sockets';

export class JobService {
  public static async getMyJobs(
    userId: string,
    query: { status?: string; page?: string; limit?: string }
  ): Promise<{ jobs: IJob[]; total: number; page: number; limit: number }> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = { partnerId: partner._id };
    if (query.status) {
      filter.status = query.status;
    }

    const [jobs, total] = await Promise.all([
      JobModel.find(filter)
        .populate({
          path: 'bookingId',
          populate: [
            { path: 'vehicleId' },
            { path: 'serviceId' },
            { path: 'cityId' }
          ],
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      JobModel.countDocuments(filter),
    ]);

    return { jobs, total, page, limit };
  }

  public static async startJob(userId: string, jobId: string): Promise<IJob> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError('You are not authorized to start this job');
    }

    if (job.status !== 'NOT_STARTED') {
      throw new ApiError(400, `Cannot start job in ${job.status} status`, ERROR_CODES.VALIDATION_ERROR);
    }

    // Update Job status
    job.status = 'IN_PROGRESS';
    job.startedAt = new Date();
    await job.save();

    // Sync status with Booking
    await BookingModel.findByIdAndUpdate(job.bookingId, {
      $set: { status: BOOKING_STATUS.IN_PROGRESS },
    });

    // Notify customer that service has started
    try {
      const booking = await BookingModel.findById(job.bookingId);
      if (booking) {
        const { notificationService } = require('../../../notification/notification.service');
        const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');
        const { logger } = require('../../../../config/logger.config');

        await notificationService.sendNotification(
          booking.customerId.toString(),
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.JOB_STATUS,
          'Service Started',
          `Your car service has been started by the partner.`,
          { bookingId: booking._id.toString(), jobId: job._id.toString() }
        );

        // Emit live socket event to customer
        emitToUser(booking.customerId.toString(), 'booking_status_update', {
          bookingId: booking._id.toString(),
          status: BOOKING_STATUS.IN_PROGRESS
        });
      }
    } catch (notifErr: any) {
      const { logger } = require('../../../../config/logger.config');
      logger.warn('Failed to send job start notification:', notifErr);
    }

    return job;
  }

  public static async completeJob(
    userId: string,
    jobId: string,
    data?: { finalAmount?: number }
  ): Promise<IJob> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError('You are not authorized to complete this job');
    }

    if (job.status !== 'IN_PROGRESS') {
      throw new ApiError(400, `Cannot complete job in ${job.status} status`, ERROR_CODES.VALIDATION_ERROR);
    }

    // Update Job status
    job.status = 'COMPLETED';
    job.completedAt = new Date();
    if (data && data.finalAmount !== undefined) {
      job.finalAmount = data.finalAmount;
    }
    await job.save();

    // Sync status with Booking
    await BookingModel.findByIdAndUpdate(job.bookingId, {
      $set: { status: BOOKING_STATUS.COMPLETED },
    });

    // Notify customer that service is completed
    try {
      const booking = await BookingModel.findById(job.bookingId);
      if (booking) {
        const { notificationService } = require('../../../notification/notification.service');
        const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');
        const { logger } = require('../../../../config/logger.config');

        // SMS
        await notificationService.sendNotification(
          booking.customerId.toString(),
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.JOB_STATUS,
          'Service Completed',
          `Your car cleaning service is completed. Please review and pay.`,
          { bookingId: booking._id.toString(), jobId: job._id.toString() }
        );

        // EMAIL
        await notificationService.sendNotification(
          booking.customerId.toString(),
          NOTIFICATION_TYPE.EMAIL,
          NOTIFICATION_CATEGORY.JOB_STATUS,
          'Service Completed',
          `Your car service has been completed. Please log in to pay and rate the service.`,
          { bookingId: booking._id.toString(), jobId: job._id.toString() }
        );

        // Emit live socket event to customer
        emitToUser(booking.customerId.toString(), 'booking_status_update', {
          bookingId: booking._id.toString(),
          status: BOOKING_STATUS.COMPLETED
        });
      }
    } catch (notifErr: any) {
      const { logger } = require('../../../../config/logger.config');
      logger.warn('Failed to send job completion notifications:', notifErr);
    }

    return job;
  }

  public static async uploadJobInvoice(
    userId: string,
    jobId: string,
    invoiceUrl: string
  ): Promise<IJob> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError('You are not authorized to upload invoice for this job');
    }

    job.invoiceUrl = invoiceUrl;
    return job.save();
  }

  public static async uploadJobPhotos(
    userId: string,
    jobId: string,
    photos: string[],
    type: 'before' | 'after'
  ): Promise<IJob> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError('You are not authorized to upload photos for this job');
    }

    console.log(`uploadJobPhotos triggered with type: ${type}, photos: ${photos}`);
    if (type?.toLowerCase() === 'before') {
      job.beforePhotos = [...(job.beforePhotos || []), ...photos];
      job.markModified('beforePhotos');
    } else {
      job.afterPhotos = [...(job.afterPhotos || []), ...photos];
      job.markModified('afterPhotos');
    }
    
    console.log(`Saving job with beforePhotos: ${job.beforePhotos}, afterPhotos: ${job.afterPhotos}`);
    await job.save();
    return job;
  }

  public static async uploadJobWarranty(
    userId: string,
    jobId: string,
    data: { warrantyPeriodMonths: number; warrantyDocumentUrl?: string }
  ): Promise<any> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    const job = await JobModel.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError('You are not authorized to issue warranty for this job');
    }

    if (job.status !== 'COMPLETED') {
      throw new ApiError(400, 'Warranty can only be issued for completed jobs', ERROR_CODES.VALIDATION_ERROR);
    }

    // Get related booking details to acquire customerId
    const booking = await BookingModel.findById(job.bookingId);
    if (!booking) {
      throw new NotFoundError('Related booking not found');
    }

    // Create the Warranty document
    const warranty = await WarrantyModel.create({
      bookingId: job.bookingId,
      customerId: booking.customerId,
      warrantyPeriodMonths: data.warrantyPeriodMonths,
      warrantyDocumentUrl: data.warrantyDocumentUrl,
      startDate: new Date(),
      status: 'ACTIVE',
    });

    // Notify customer that warranty is issued
    try {
      const { notificationService } = require('../../../notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');
      const { logger } = require('../../../../config/logger.config');

      await notificationService.sendNotification(
        booking.customerId.toString(),
        NOTIFICATION_TYPE.EMAIL,
        NOTIFICATION_CATEGORY.GENERAL,
        'Warranty Issued',
        `A warranty of ${data.warrantyPeriodMonths} months has been issued for your booking ${job.bookingId}.`,
        { bookingId: job.bookingId.toString(), warrantyId: warranty._id.toString() }
      );
    } catch (notifErr: any) {
      const { logger } = require('../../../../config/logger.config');
      logger.warn('Failed to send warranty notification:', notifErr);
    }

  }

  public static async requestJobExtension(
    userId: string,
    jobId: string,
    data: { partName: string; cost: number }
  ): Promise<IJob> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) throw new NotFoundError('Partner profile not found');

    const job = await JobModel.findById(jobId);
    if (!job) throw new NotFoundError('Job not found');
    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError('Not authorized');
    }

    job.jobExtensions.push({
      partName: data.partName,
      cost: data.cost,
      status: 'PENDING'
    });

    await job.save();

    // Notify customer about extension request
    try {
      const booking = await BookingModel.findById(job.bookingId);
      if (booking) {
        const { notificationService } = require('../../../notification/notification.service');
        const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../../../notification/notification.model');
        await notificationService.sendNotification(
          booking.customerId.toString(),
          NOTIFICATION_TYPE.EMAIL,
          NOTIFICATION_CATEGORY.GENERAL,
          'Approval Needed for Extra Part',
          `The garage has requested an extension for part: ${data.partName} costing ${data.cost}. Please approve or reject.`,
          { bookingId: booking._id.toString() }
        );
      }
    } catch (e) {
      console.warn('Failed to send extension notification', e);
    }

    return job;
  }

  public static async assignStaff(
    userId: string,
    jobId: string,
    staffId: string
  ): Promise<IJob> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) throw new NotFoundError('Partner profile not found');

    const job = await JobModel.findById(jobId);
    if (!job) throw new NotFoundError('Job not found');
    if (job.partnerId.toString() !== partner._id.toString()) {
      throw new UnauthorizedError('Not authorized');
    }

    // Assign staff
    job.staffId = staffId as any;
    return job.save();
  }
}
export default JobService;
