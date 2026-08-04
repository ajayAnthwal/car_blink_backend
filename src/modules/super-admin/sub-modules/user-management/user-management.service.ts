import { UserModel, IUser } from '../../../user/user.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';

export class UserManagementService {
  /**
   * Paginated list of all users, with filters and search
   */
  async getAllUsers(
    query: any = {}
  ): Promise<{ users: IUser[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.role) {
      filter.role = query.role;
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true';
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UserModel.countDocuments(filter),
    ]);

    return { users, total, page, limit };
  }

  /**
   * Update any user account active status or role
   */
  async updateUser(userId: string, data: { isActive?: boolean; role?: string }): Promise<IUser> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (data.isActive !== undefined) {
      user.isActive = data.isActive;
    }
    
    if (data.role) {
      user.role = data.role as any;
    }

    await user.save();
    return user;
  }
  
  /**
   * Update user stats (Savings and Rewards) manually
   */
  async updateUserStats(userId: string, data: { totalSavings?: number; rewardPoints?: number }): Promise<IUser> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (data.totalSavings !== undefined) {
      user.totalSavings = data.totalSavings;
    }
    
    if (data.rewardPoints !== undefined) {
      user.rewardPoints = data.rewardPoints;
    }

    await user.save();
    return user;
  }
}

export const userManagementService = new UserManagementService();
export default userManagementService;
