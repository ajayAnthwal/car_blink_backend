import { Response } from 'express';
import { IRequest } from '../../../../common/interfaces/IRequest';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { customerWalletService } from './customer-wallet.service';
import { UnauthorizedError } from '../../../../common/errors/UnauthorizedError';

export class CustomerWalletController {
  public static getMyWallet = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    if (!customerId) {
      throw new UnauthorizedError('Customer ID not found in session');
    }

    const data = await customerWalletService.getMyWalletWithTransactions(
      customerId,
      req.query as { page?: string; limit?: string }
    );

    return successResponse(res, data, 'Customer wallet retrieved successfully');
  });
}
