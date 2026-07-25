import mongoose from 'mongoose';
import { connectDatabase } from '../../config/database.config';
import { UserModel } from '../../modules/user/user.model';
import { PartnerModel } from '../../modules/partner/partner.model';
import { BookingModel } from '../../modules/customer/sub-modules/booking/booking.model';
import { BidModel } from '../../modules/partner/sub-modules/bidding/bid.model';
import { JobModel } from '../../modules/partner/sub-modules/jobs/job.model';
import { logger } from '../../config/logger.config';
import { ROLES } from '../../common/constants/roles.constant';

const adminUser = {
  fullName: 'Super Admin User',
  email: 'admin@carblink.com',
  phone: '9999999999',
  password: 'Password@123',
  role: ROLES.SUPER_ADMIN,
  status: 'ACTIVE'
};

const accountantUser = {
  fullName: 'Accountant User',
  email: 'accountant@carblink.com',
  phone: '8888888888',
  password: 'Password@123',
  role: ROLES.ACCOUNTS,
  status: 'ACTIVE'
};

const executiveUser = {
  fullName: 'Executive User',
  email: 'executive@carblink.com',
  phone: '7777777777',
  password: 'Password@123',
  role: ROLES.EXECUTIVE,
  status: 'ACTIVE'
};

const customerUsers = [
  {
    fullName: 'Customer One',
    email: 'customer1@carblink.com',
    phone: '6666666661',
    password: 'Password@123',
    role: ROLES.CUSTOMER,
    status: 'ACTIVE'
  },
  {
    fullName: 'Customer Two',
    email: 'customer2@carblink.com',
    phone: '6666666662',
    password: 'Password@123',
    role: ROLES.CUSTOMER,
    status: 'ACTIVE'
  }
];

const partnerUsers = [
  {
    fullName: 'Partner One',
    email: 'partner1@carblink.com',
    phone: '5555555551',
    password: 'Password@123',
    role: ROLES.PARTNER,
    status: 'ACTIVE'
  },
  {
    fullName: 'Partner Two',
    email: 'partner2@carblink.com',
    phone: '5555555552',
    password: 'Password@123',
    role: ROLES.PARTNER,
    status: 'ACTIVE'
  }
];

const runFreshSeed = async () => {
  try {
    await connectDatabase();
    logger.info('Connected to database for fresh seeding...');

    // Drop collections
    logger.info('Wiping out existing data...');
    await Promise.all([
      UserModel.deleteMany({}),
      PartnerModel.deleteMany({}),
      BookingModel.deleteMany({}),
      BidModel.deleteMany({}),
      JobModel.deleteMany({})
    ]);
    logger.info('Old data wiped successfully.');

    // Seed Admin, Accountant, Executive
    await UserModel.create([adminUser, accountantUser, executiveUser]);
    logger.info('Seeded Admin, Accountant, and Executive accounts.');

    // Seed Customers
    await UserModel.create(customerUsers);
    logger.info('Seeded Customer accounts.');

    // Fetch a city for partner
    const { CityModel } = require('../../modules/master-data/models/city.model');
    const city = await CityModel.findOne({ name: 'Delhi' });
    const cityId = city ? city._id : null;

    // Seed Partners
    for (const p of partnerUsers) {
      const user = await UserModel.create(p);
      await PartnerModel.create({
        userId: user._id,
        businessName: `${p.fullName} Auto Care`,
        businessAddress: '123 Main Street',
        cityId: cityId,
        ownerName: p.fullName,
        serviceArea: {
          coordinates: [77.2090, 28.6139], // Default Delhi coordinates
          radiusKm: 20
        },
        servicesOffered: [],
        rating: 4.5,
        totalJobsCompleted: 0,
        kycStatus: 'VERIFIED',
        isVerified: true,
        status: 'ACTIVE'
      });
    }
    logger.info('Seeded Partner accounts and profiles.');

    logger.info('=============================================');
    logger.info('Fresh Seed Completed Successfully!');
    logger.info('=============================================');
    logger.info('Admin: admin@carblink.com / Password@123');
    logger.info('Accountant: accountant@carblink.com / Password@123');
    logger.info('Executive: executive@carblink.com / Password@123');
    logger.info('Customers: customer1@carblink.com, customer2@carblink.com / Password@123');
    logger.info('Partners: partner1@carblink.com, partner2@carblink.com / Password@123');
    logger.info('=============================================');
    
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed', error);
    process.exit(1);
  }
};

runFreshSeed();
