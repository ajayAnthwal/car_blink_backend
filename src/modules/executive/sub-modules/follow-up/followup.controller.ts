import { Response } from 'express';
import { followUpService } from './followup.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class FollowUpController {
  public static logFollowUpCall = asyncHandler(async (req: IRequest, res: Response) => {
    const executiveId = req.user?.userId;
    const result = await followUpService.logFollowUpCall(String(executiveId), req.body);
    return successResponse(res, result, 'Follow-up call logged successfully', 201);
  });

  public static getMyFollowUps = asyncHandler(async (req: IRequest, res: Response) => {
    const executiveId = req.user?.userId;
    const result = await followUpService.getMyFollowUps(String(executiveId), req.query);
    return successResponse(res, result, 'Follow-up logs retrieved successfully');
  });

  public static getPendingFollowUps = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await followUpService.getPendingFollowUps(req.query);
    return successResponse(res, result, 'Pending follow-up calls retrieved successfully');
  });

  public static updateFollowUp = asyncHandler(async (req: IRequest, res: Response) => {
    const executiveId = req.user?.userId;
    const { id } = req.params;
    const result = await followUpService.updateFollowUp(String(executiveId), id, req.body);
    return successResponse(res, result, 'Follow-up log updated successfully');
  });
}
