import { Response } from 'express';
import { EarningsService } from './earnings.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class EarningsController {
  public static getMyEarnings = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const result = await EarningsService.getMyEarnings(String(userId), req.query as any);
    return successResponse(res, result, 'Earnings retrieved successfully');
  });

  public static getEarningsSummary = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const result = await EarningsService.getEarningsSummary(String(userId));
    return successResponse(res, result, 'Earnings summary retrieved successfully');
  });

  public static getMySettlements = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const result = await EarningsService.getMySettlements(String(userId));
    return successResponse(res, result, 'Settlements retrieved successfully');
  });
}
export default EarningsController;
