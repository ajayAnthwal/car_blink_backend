import { Response } from 'express';
import { growthService } from './growth.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class GrowthController {
  public static getUserGrowth = asyncHandler(async (req: IRequest, res: Response) => {
    const { fromDate, toDate, groupBy } = req.query as {
      fromDate: string;
      toDate: string;
      groupBy: 'day' | 'week' | 'month';
    };
    const result = await growthService.getUserGrowth(fromDate, toDate, groupBy);
    return successResponse(res, result, 'User growth report generated successfully');
  });

  public static getBookingGrowth = asyncHandler(async (req: IRequest, res: Response) => {
    const { fromDate, toDate, groupBy } = req.query as {
      fromDate: string;
      toDate: string;
      groupBy: 'day' | 'week' | 'month';
    };
    const result = await growthService.getBookingGrowth(fromDate, toDate, groupBy);
    return successResponse(res, result, 'Booking growth report generated successfully');
  });

  public static getPartnerVerificationFunnel = asyncHandler(
    async (req: IRequest, res: Response) => {
      const result = await growthService.getPartnerVerificationFunnel();
      return successResponse(res, result, 'Partner verification funnel retrieved successfully');
    }
  );
}
export default GrowthController;
