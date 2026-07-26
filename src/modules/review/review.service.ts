import mongoose from 'mongoose';
import { ReviewModel, IReview } from './review.model';
import { BookingModel } from '../customer/sub-modules/booking/booking.model';
import { JobModel } from '../partner/sub-modules/jobs/job.model';
import { PartnerModel } from '../partner/partner.model';
import { notificationService } from '../notification/notification.service';
import { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } from '../notification/notification.model';
import { NotFoundError } from '../../common/errors/NotFoundError';
import { UnauthorizedError } from '../../common/errors/UnauthorizedError';
import { ConflictError } from '../../common/errors/ConflictError';
import { ApiError } from '../../common/errors/ApiError';
import { BOOKING_STATUS } from '../../common/constants/status.constant';
import { ERROR_CODES } from '../../common/constants/error-codes.constant';
import { logger } from '../../config/logger.config';

export class ReviewService {
  /**
   * Submit a review for a completed booking
   */
  async createReview(
    customerId: string,
    data: { bookingId: string; rating: number; comment?: string }
  ): Promise<IReview> {
    // 1. Fetch booking and perform ownership check
    const booking = await BookingModel.findById(data.bookingId);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    if (booking.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You are not authorized to review this booking');
    }

    // 2. Validate booking status (must be COMPLETED)
    if (booking.status !== BOOKING_STATUS.COMPLETED) {
      throw new ApiError(
        400,
        'You can only review completed services',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // 3. Enforce single review constraint
    const existingReview = await ReviewModel.findOne({ bookingId: data.bookingId });
    if (existingReview) {
      throw new ConflictError('A review has already been submitted for this booking');
    }

    // 4. Fetch the related job to resolve partnerId
    const job = await JobModel.findOne({ bookingId: data.bookingId });
    if (!job) {
      throw new NotFoundError('Job details not found for this booking');
    }

    // 5. Create Review
    const review = await ReviewModel.create({
      bookingId: data.bookingId,
      jobId: job._id,
      customerId,
      partnerId: job.partnerId,
      rating: data.rating,
      comment: data.comment,
    });

    // 6. Recalculate partner aggregate rating and reviews count
    try {
      const stats = await ReviewModel.aggregate([
        { $match: { partnerId: new mongoose.Types.ObjectId(job.partnerId.toString()) } },
        {
          $group: {
            _id: '$partnerId',
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
          },
        },
      ]);

      if (stats.length > 0) {
        await PartnerModel.findByIdAndUpdate(job.partnerId, {
          $set: {
            rating: Number(stats[0].averageRating.toFixed(2)),
            totalReviews: stats[0].totalReviews,
          },
        });
      } else {
        await PartnerModel.findByIdAndUpdate(job.partnerId, {
          $set: {
            rating: 0,
            totalReviews: 0,
          },
        });
      }
    } catch (aggErr: any) {
      logger.error('Failed to aggregate partner reviews:', aggErr);
    }

    // 7. Dispatch SMS notification to the partner (try-catch isolated)
    try {
      const partner = await PartnerModel.findById(job.partnerId);
      if (partner) {
        await notificationService.sendNotification(
          partner.userId.toString(),
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.REVIEW_RECEIVED,
          'New Review Received',
          `You have received a new review with a rating of ${data.rating}/5 for your service.`,
          { bookingId: data.bookingId, reviewId: review._id.toString() }
        );
      }
    } catch (notifErr: any) {
      logger.warn('Failed to send review notification to partner:', notifErr);
    }

    return review;
  }

  /**
   * Retrieve paginated list of reviews for a partner (PUBLIC)
   */
  async getPartnerReviews(
    partnerId: string,
    query: any = {}
  ): Promise<{ reviews: IReview[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      ReviewModel.find({ partnerId })
        .populate('customerId', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ReviewModel.countDocuments({ partnerId }),
    ]);

    return { reviews, total, page, limit };
  }

  /**
   * Retrieve paginated list of reviews submitted by a customer
   */
  async getMyReviews(
    customerId: string,
    query: any = {}
  ): Promise<{ reviews: IReview[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      ReviewModel.find({ customerId })
        .populate({
          path: 'partnerId',
          select: 'businessName userId',
          populate: { path: 'userId', select: 'fullName' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ReviewModel.countDocuments({ customerId }),
    ]);

    return { reviews, total, page, limit };
  }

  /**
   * Verify review eligibility for a booking
   */
  async canReviewBooking(customerId: string, bookingId: string): Promise<{ canReview: boolean }> {
    const booking = await BookingModel.findById(bookingId);
    if (!booking) {
      return { canReview: false };
    }

    if (booking.customerId.toString() !== customerId) {
      return { canReview: false };
    }

    if (booking.status !== BOOKING_STATUS.COMPLETED) {
      return { canReview: false };
    }

    const existingReview = await ReviewModel.findOne({ bookingId });
    if (existingReview) {
      return { canReview: false };
    }

    return { canReview: true };
  }
}

export const reviewService = new ReviewService();
export default reviewService;
