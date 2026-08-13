import { Response } from 'express';
import { ActivityLogService } from './activity-log.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class ActivityLogController {
  public static getRecentLogs = asyncHandler(async (req: IRequest, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const result = await ActivityLogService.getRecentLogs(limit);
    return successResponse(res, result, 'Activity logs retrieved successfully');
  });
}
