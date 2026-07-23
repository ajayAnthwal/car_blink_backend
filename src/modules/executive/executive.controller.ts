import { Response } from 'express';
import { executiveService } from './executive.service';
import { successResponse } from '../../common/utils/apiResponse.util';
import { asyncHandler } from '../../common/utils/asyncHandler.util';
import { IRequest } from '../../common/interfaces/IRequest';

export class ExecutiveController {
  public static getCustomerStatusOverview = asyncHandler(async (req: IRequest, res: Response) => {
    const overview = await executiveService.getCustomerStatusOverview(req.query);
    return successResponse(res, overview, 'Customer status overview retrieved successfully');
  });

  public static getPartnerStatusOverview = asyncHandler(async (req: IRequest, res: Response) => {
    const overview = await executiveService.getPartnerStatusOverview(req.query);
    return successResponse(res, overview, 'Partner status overview retrieved successfully');
  });

  public static clickToCall = asyncHandler(async (req: IRequest, res: Response) => {
    const { targetUserId, phoneNumber } = req.body;
    
    // In a real application, you would integrate with Exotel, Twilio, etc here.
    // For now, this is a dummy integration.
    
    console.log(`[TELEPHONY] Executive ${req.user?.userId} initiated a call to ${phoneNumber || targetUserId}`);
    
    return successResponse(res, {
      status: 'INITIATED',
      callId: `CALL-${Date.now()}`,
      message: 'Call has been initiated. Waiting for connection.'
    }, 'Call initiated successfully');
  });
}
