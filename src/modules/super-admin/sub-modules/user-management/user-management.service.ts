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
   * Toggle any user account active status
   */
  async toggleUserStatus(userId: string, isActive: boolean): Promise<IUser> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    user.isActive = isActive;
    await user.save();

    return user;
  }
}

export const userManagementService = new UserManagementService();
export default userManagementService;
