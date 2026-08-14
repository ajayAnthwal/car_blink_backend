import { UserModel } from '../../../../modules/user/user.model';
import RoleModel from '../roles/role.model';
import bcrypt from 'bcrypt';
import { ROLES } from '../../../../common/constants/roles.constant';
import { NotFoundError } from '../../../../common/errors/NotFoundError';

export class SuperAdminStaffService {
  async getAllStaff(query: any) {
    const { page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    // Fetch users who are ADMIN or have a customRoleId
    const filter = {
      role: { $in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] }
    };

    const staff = await UserModel.find(filter)
      .populate('customRoleId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await UserModel.countDocuments(filter);

    return {
      docs: staff,
      totalDocs: total,
      limit: Number(limit),
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  async createStaff(data: any) {
    const { fullName, email, phone, password, customRoleId } = data;

    const existingUser = await UserModel.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      throw new Error('User with this email or phone already exists');
    }

    const newStaff = await UserModel.create({
      fullName,
      email,
      phone,
      password: password, // Mongoose pre-save hook handles hashing
      role: ROLES.ADMIN,
      customRoleId,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    });

    return newStaff;
  }

  async getRoles() {
    return await RoleModel.find({ isActive: true });
  }
}

export const superAdminStaffService = new SuperAdminStaffService();
