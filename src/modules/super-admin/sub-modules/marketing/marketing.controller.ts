import { Response } from 'express';
import { marketingService } from './marketing.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class MarketingController {
  public static getTopCities = asyncHandler(async (req: IRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const result = await marketingService.getTopCities(limit);
    return successResponse(res, result, 'Top cities report generated successfully');
  });

  public static getTopServices = asyncHandler(async (req: IRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const result = await marketingService.getTopServices(limit);
    return successResponse(res, result, 'Top services report generated successfully');
  });

  public static getCustomerRetention = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await marketingService.getCustomerRetention();
    return successResponse(res, result, 'Customer retention metrics retrieved successfully');
  });
}
export default MarketingController;
