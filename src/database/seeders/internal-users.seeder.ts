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

const executiveUser = {
  fullName: 'Test Executive User',
  email: 'executive@carblink.com',
  phone: '8888888888',
  password: 'Password@123', // Hashed by userSchema pre-save hook
  role: ROLES.EXECUTIVE,
  isPhoneVerified: true,
  isEmailVerified: true,
  isActive: true,
};

const accountsUser = {
  fullName: 'Test Accounts User',
  email: 'accounts@carblink.com',
  phone: '7777777777',
  password: 'Password@123', // Hashed by userSchema pre-save hook
  role: ROLES.ACCOUNTS,
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

    const existingExecutive = await UserModel.findOne({ email: executiveUser.email });
    if (!existingExecutive) {
      await UserModel.create(executiveUser);
      logger.info(`Seeded Executive user successfully.`);
      logger.info(`Credentials -> Email: ${executiveUser.email}, Password: ${executiveUser.password}`);
    } else {
      logger.info(`Executive user already exists.`);
    }

    const existingAccounts = await UserModel.findOne({ email: accountsUser.email });
    if (!existingAccounts) {
      await UserModel.create(accountsUser);
      logger.info(`Seeded Accounts user successfully.`);
      logger.info(`Credentials -> Email: ${accountsUser.email}, Password: ${accountsUser.password}`);
    } else {
      logger.info(`Accounts user already exists.`);
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
