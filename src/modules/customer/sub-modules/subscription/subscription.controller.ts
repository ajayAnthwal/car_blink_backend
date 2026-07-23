import { Response } from 'express';
import { SubscriptionService } from './subscription.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class SubscriptionController {
  public static purchase = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const sub = await SubscriptionService.purchase(String(customerId), req.body);
    return successResponse(res, sub, 'Subscription purchased successfully', 201);
  });

  public static getMySubscriptions = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const subs = await SubscriptionService.getUserSubscriptions(String(customerId));
    return successResponse(res, subs, 'Subscriptions retrieved successfully');
  });

  public static checkValidity = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const valid = await SubscriptionService.checkValidity(String(customerId));
    return successResponse(res, valid, 'Subscription validity checked successfully');
  });
}
export default SubscriptionController;