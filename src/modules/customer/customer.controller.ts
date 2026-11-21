import { Response } from 'express';
import { IRequest } from '../../common/interfaces/IRequest';
import { asyncHandler } from '../../common/utils/asyncHandler.util';
import { successResponse } from '../../common/utils/apiResponse.util';
import { UserModel } from '../user/user.model';
import { NotFoundError } from '../../common/errors/NotFoundError';
import { CustomerService } from './customer.service';

export class CustomerController {
  /**
   * Get customer stats like totalSavings and rewardPoints
   */
  public static getCustomerStats = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    if (!customerId) {
      throw new NotFoundError('Customer not found');
    }

    const customer = await UserModel.findById(customerId).select('totalSavings rewardPoints');
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    const stats = {
      totalSavings: customer.totalSavings || 0,
      rewardPoints: customer.rewardPoints || 0
    };

    return successResponse(res, stats, 'Customer stats retrieved successfully');
  });

  /**
   * Accept Customer Terms & Conditions
   */
  public static acceptTerms = asyncHandler(async (req: IRequest, res: Response) => {
    const customerId = req.user?.userId;
    if (!customerId) {
      throw new NotFoundError('Customer not found');
    }

    const { version } = req.body || {};
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] as string;

    const result = await CustomerService.acceptTerms(String(customerId), version, ip, userAgent);

    return successResponse(
      res,
      {
        isTermsAccepted: result.isTermsAccepted,
        termsAcceptedAt: result.termsAcceptedAt,
        termsVersion: result.termsVersion,
      },
      result.alreadyAccepted
        ? 'Terms & Conditions were already accepted'
        : 'Terms & Conditions accepted successfully'
    );
  });
}
export default CustomerController;
