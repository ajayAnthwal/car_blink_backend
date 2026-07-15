import { Response } from 'express';
import { leadsTodayService } from './leads-today.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class LeadsTodayController {
  public static getTodaysLeadsStats = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await leadsTodayService.getTodaysLeadsStats();
    return successResponse(res, result, "Today's leads statistics retrieved successfully");
  });

  public static getTodaysLeadsList = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await leadsTodayService.getTodaysLeadsList(req.query);
    return successResponse(res, result, "Today's leads list retrieved successfully");
  });
}
export default LeadsTodayController;
