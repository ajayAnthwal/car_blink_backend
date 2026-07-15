import { Response } from 'express';
import { reviewService } from './review.service';
import { successResponse } from '../../common/utils/apiResponse.util';
import { asyncHandler } from '../../common/utils/asyncHandler.util';
import { IRequest } from '../../common/interfaces/IRequest';

export class ReviewController {
  public static createReview = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = String(req.user?.userId);
    const result = await reviewService.createReview(customerId, req.body);
    return successResponse(res, result, 'Review submitted successfully', 201);
  });

  public static getPartnerReviews = asyncHandler(async (req: IRequest, res: Response) => {
    const { partnerId } = req.params;
    const result = await reviewService.getPartnerReviews(partnerId, req.query);
    return successResponse(res, result, 'Partner reviews retrieved successfully');
  });

  public static getMyReviews = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = String(req.user?.userId);
    const result = await reviewService.getMyReviews(customerId, req.query);
    return successResponse(res, result, 'My reviews retrieved successfully');
  });

  public static canReviewBooking = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = String(req.user?.userId);
    const { bookingId } = req.params;
    const result = await reviewService.canReviewBooking(customerId, bookingId);
    return successResponse(res, result, 'Review eligibility checked successfully');
  });
}
