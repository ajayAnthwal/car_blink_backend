import { Response } from 'express';
import { notificationService } from './notification.service';
import { successResponse } from '../../common/utils/apiResponse.util';
import { asyncHandler } from '../../common/utils/asyncHandler.util';
import { IRequest } from '../../common/interfaces/IRequest';

export class NotificationController {
  public static getMyNotifications = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = String(req.user?.userId);
    const result = await notificationService.getMyNotifications(userId, req.query);
    return successResponse(res, result, 'Notifications retrieved successfully');
  });

  public static markAsRead = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = String(req.user?.userId);
    const result = await notificationService.markAsRead(userId, req.params.id);
    return successResponse(res, result, 'Notification marked as read successfully');
  });

  public static markAllAsRead = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = String(req.user?.userId);
    const result = await notificationService.markAllAsRead(userId);
    return successResponse(res, result, 'All notifications marked as read successfully');
  });
}
