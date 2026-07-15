import { Response } from 'express';
import { successResponse } from '../../common/utils/apiResponse.util';
import { asyncHandler } from '../../common/utils/asyncHandler.util';
import { IRequest } from '../../common/interfaces/IRequest';
import { getConnectedSocketsCount, isUserConnected } from '../../sockets';
import { notificationService } from '../notification/notification.service';
import { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } from '../notification/notification.model';

export class SocketsController {
  /**
   * Retrieves how many sockets are connected in total and whether the requesting user is connected.
   */
  public static getSocketsStatus = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = String(req.user?.userId);
    const totalConnected = getConnectedSocketsCount();
    const isCurrentUserConnected = isUserConnected(userId);

    return successResponse(
      res,
      {
        totalConnected,
        isCurrentUserConnected,
      },
      'Sockets status retrieved successfully'
    );
  });

  /**
   * Triggers a test notification for E2E validation in the running Express process.
   */
  public static triggerTestNotification = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = String(req.user?.userId);
    const notification = await notificationService.sendNotification(
      userId,
      NOTIFICATION_TYPE.PUSH,
      NOTIFICATION_CATEGORY.BOOKING_UPDATE,
      'Live WebSocket Test',
      'Hello from real-time websocket verification!'
    );

    return successResponse(res, notification, 'Test notification triggered successfully');
  });
}
