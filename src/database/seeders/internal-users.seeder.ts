import mongoose from 'mongoose';
import { connectDatabase } from '../../config/database.config';
import { UserModel } from '../../modules/user/user.model';
import { logger } from '../../config/logger.config';
import { ROLES } from '../../common/constants/roles.constant';

const adminUser = {
  fullName: 'Super Admin User',
  email: 'admin@carblink.com',
  phone: '9999999999',
  password: 'Password@123', // Hashed by userSchema pre-save hook
  role: ROLES.SUPER_ADMIN,
  isPhoneVerified: true,
  isEmailVerified: true,
  isActive: true,
};

const seedInternalUsers = async (): Promise<void> => {
  try {
    await connectDatabase();
    logger.info('Connected to database for seeding internal users.');

    const existingAdmin = await UserModel.findOne({ email: adminUser.email });
    if (!existingAdmin) {
      await UserModel.create(adminUser);
      logger.info(`Seeded Super Admin user successfully.`);
      logger.info(`Credentials -> Email: ${adminUser.email}, Password: ${adminUser.password}`);
    } else {
      logger.info(`Super Admin user already exists.`);
    }

    await mongoose.disconnect();
    logger.info('Disconnected from database.');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding internal users:', error);
    process.exit(1);
  }
};

seedInternalUsers();
