import { Response } from 'express';
import { userManagementService } from './user-management.service';
import { successResponse } from '../../../../common/utils/apiResponse.util';
import { asyncHandler } from '../../../../common/utils/asyncHandler.util';
import { IRequest } from '../../../../common/interfaces/IRequest';

export class UserManagementController {
  public static getAllUsers = asyncHandler(async (req: IRequest, res: Response) => {
    const result = await userManagementService.getAllUsers(req.query);
    return successResponse(res, result, 'Users retrieved successfully');
  });

  public static updateUser = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const { isActive, role, password, fullName, email, phone } = req.body;
    const result = await userManagementService.updateUser(id, { isActive, role, password, fullName, email, phone });
    return successResponse(
      res,
      result,
      `User updated successfully`
    );
  });

  public static updateUserStats = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const { totalSavings, rewardPoints } = req.body;
    const result = await userManagementService.updateUserStats(id, { totalSavings, rewardPoints });
    return successResponse(
      res,
      result,
      `User stats updated successfully`
    );
  });
}
export default UserManagementController;
