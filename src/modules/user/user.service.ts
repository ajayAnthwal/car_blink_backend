import { UserModel, IUser } from './user.model';
import { NotFoundError } from '../../common/errors/NotFoundError';
import { UnauthorizedError } from '../../common/errors/UnauthorizedError';
import { BadRequestError } from '../../common/errors/BadRequestError';

export class UserService {
  public static async getUserProfile(userId: string): Promise<Partial<IUser>> {
    const user = await UserModel.findOne({ _id: userId, isActive: true });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  }

  public static async updateUserProfile(
    userId: string,
    data: Record<string, any>
  ): Promise<Partial<IUser>> {
    const user = await UserModel.findOneAndUpdate(
      { _id: userId, isActive: true },
      { $set: data },
      { new: true }
    );
    if (!user) {
      throw new NotFoundError('User not found');
    }
    const userObj = user.toObject();
    delete userObj.password;
    return userObj;
  }

  public static async changePassword(
    userId: string,
    currentPassword?: string,
    newPassword?: string
  ): Promise<{ message: string }> {
    const user = await UserModel.findOne({ _id: userId, isActive: true }).select('+password');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isDefaultOtpPassword = user.password ? await user.comparePassword('CarBlink@123') : true;

    if (!isDefaultOtpPassword) {
      // Account HAS a custom password: currentPassword is required and must match
      if (!currentPassword || typeof currentPassword !== 'string' || currentPassword.trim() === '') {
        throw new BadRequestError('Current password is required');
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        throw new UnauthorizedError('Current password is incorrect');
      }
    }

    user.password = newPassword;
    await user.save();

    return { message: isDefaultOtpPassword ? 'Password set successfully' : 'Password changed successfully' };
  }

  public static async deactivateOwnAccount(userId: string): Promise<{ success: boolean }> {
    const user = await UserModel.findOneAndUpdate(
      { _id: userId, isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return { success: true };
  }

  public static async registerDeviceToken(userId: string, deviceToken: string): Promise<{ success: boolean }> {
    const user = await UserModel.findOne({ _id: userId, isActive: true });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.deviceTokens) {
      user.deviceTokens = [];
    }

    if (!user.deviceTokens.includes(deviceToken)) {
      user.deviceTokens.push(deviceToken);
      await user.save();
    }

    return { success: true };
  }
}
export default UserService;
