import { Response } from 'express';
import { superAdminNotificationsService } from './notifications.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class SuperAdminNotificationsController {
  public static getHistory = asyncHandler(async (req: IRequest, res: Response) => {
    const history = await superAdminNotificationsService.getHistory();
    return successResponse(res, history, 'Notification history retrieved');
  });

  public static sendNotification = asyncHandler(async (req: IRequest, res: Response) => {
    const adminId = req.user?.userId as string;
    const record = await superAdminNotificationsService.sendNotification(req.body, adminId);
    return successResponse(res, record, 'Notification dispatched successfully');
  });
}

export default SuperAdminNotificationsController;
