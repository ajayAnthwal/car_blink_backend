import mongoose from 'mongoose';
import { connectDatabase } from './src/config/database.config';
import { UserModel } from './src/modules/user/user.model';
import { PartnerModel } from './src/modules/partner/partner.model';
import { ROLES } from './src/common/constants/roles.constant';
import { CityModel } from './src/modules/master-data/models/city.model';

const run = async () => {
  try {
    await connectDatabase();
    console.log('Connected to DB');

    // Make sure a city exists
    let city = await CityModel.findOne();
    if (!city) {
      city = await CityModel.create({ name: 'Test City', state: 'Test State', isActive: true });
    }

    const partnerEmail = 'propartner@carblink.com';
    const partnerPassword = 'Password@123';

    let user = await UserModel.findOne({ email: partnerEmail });
    if (!user) {
      user = await UserModel.create({
        fullName: 'Pro Partner User',
        email: partnerEmail,
        phone: '1234567890',
        password: partnerPassword,
        role: ROLES.PARTNER,
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      });
      console.log('User created');
    } else {
      console.log('User already exists');
    }

    let partner = await PartnerModel.findOne({ userId: user._id });
    if (!partner) {
      partner = await PartnerModel.create({
        userId: user._id,
        businessName: 'Pro Car Services',
        businessAddress: '123 Main St, Test City',
        cityId: city._id,
        servicesOffered: [],
        gstNumber: '22AAAAA0000A1Z5',
        isVerified: true,
        verificationStatus: 'APPROVED',
        rating: 5,
        totalReviews: 10,
        dailyCapacity: 10,
      });
      console.log('Partner profile created');
    } else {
      console.log('Partner profile already exists');
    }

    console.log(`Login Email: ${partnerEmail}`);
    console.log(`Login Password: ${partnerPassword}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
