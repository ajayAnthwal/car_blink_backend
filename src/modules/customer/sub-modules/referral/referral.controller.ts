import { Response } from 'express';
import { ReferralService } from './referral.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class ReferralController {
  public static apply = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    const ref = await ReferralService.applyReferral(String(customerId), req.body);
    return successResponse(res, ref, 'Referral code applied successfully', 201);
  });
}
export default ReferralController;