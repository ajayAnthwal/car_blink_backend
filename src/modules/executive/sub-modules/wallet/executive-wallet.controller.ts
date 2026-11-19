import { Response } from 'express';
import { IRequest } from '../../../../common/interfaces/IRequest';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { executiveWalletService } from './executive-wallet.service';
import { UnauthorizedError } from '../../../../common/errors/UnauthorizedError';

export class ExecutiveWalletController {
  public static getCustomerWalletDetails = asyncHandler(async (req: IRequest, res: Response) => {
    const { customerId } = req.params;
    const data = await executiveWalletService.getCustomerWalletDetails(customerId);
    return successResponse(res, data, 'Customer wallet details retrieved successfully');
  });

  public static adjustCustomerWallet = asyncHandler(async (req: IRequest, res: Response) => {
    const executiveUserId = req.user?.userId;
    if (!executiveUserId) {
      throw new UnauthorizedError('Executive user not authenticated');
    }

    const executiveRole = req.user?.role || 'EXECUTIVE';
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || req.socket.remoteAddress || 'unknown';

    const result = await executiveWalletService.adjustCustomerWallet(
      executiveUserId,
      executiveRole,
      clientIp,
      req.body
    );

    return successResponse(res, result, 'Customer wallet adjusted successfully');
  });
}
