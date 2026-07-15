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

  public static toggleUserStatus = asyncHandler(async (req: IRequest, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const result = await userManagementService.toggleUserStatus(id, isActive);
    return successResponse(
      res,
      result,
      `User accounts status updated to ${isActive ? 'active' : 'inactive'} successfully`
    );
  });
}
export default UserManagementController;
