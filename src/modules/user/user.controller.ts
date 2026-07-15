import { Response } from 'express';
import { UserService } from './user.service';
import { successResponse } from '../../common/utils/apiResponse.util';
import { asyncHandler } from '../../common/utils/asyncHandler.util';
import { IRequest } from '../../common/interfaces/IRequest';

export class UserController {
  public static getProfile = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const profile = await UserService.getUserProfile(String(userId));
    return successResponse(res, profile, 'User profile retrieved successfully');
  });

  public static updateProfile = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const profile = await UserService.updateUserProfile(String(userId), req.body);
    return successResponse(res, profile, 'User profile updated successfully');
  });

  public static changePassword = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;
    const result = await UserService.changePassword(String(userId), currentPassword, newPassword);
    return successResponse(res, result, 'Password changed successfully');
  });

  public static deactivateAccount = asyncHandler(async (req: IRequest, res: Response) => {
    const userId = req.user?.userId;
    const result = await UserService.deactivateOwnAccount(String(userId));
    return successResponse(res, result, 'Account deactivated successfully');
  });
}
export default UserController;
