import { Response } from 'express';
import { IRequest } from '../../common/interfaces/IRequest';
import { asyncHandler } from '../../common/utils/asyncHandler.util';
import { successResponse } from '../../common/utils/apiResponse.util';
import { UserModel } from '../user/user.model';
import { NotFoundError } from '../../common/errors/NotFoundError';

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
}
