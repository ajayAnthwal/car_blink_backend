import mongoose from 'mongoose';
import { connectDatabase } from './src/config/database.config';
import { UserModel } from './src/modules/user/user.model';
import { PartnerModel } from './src/modules/partner/partner.model';
import { ROLES } from './src/common/constants/roles.constant';
import { CityModel } from './src/modules/master-data/models/city.model';
import { ServiceModel } from './src/modules/master-data/models/service.model';

const run = async () => {
  try {
    await connectDatabase();
    console.log('Connected to DB');

    // 1. Find or create Dehradun city
    let dehradun = await CityModel.findOne({ name: { $regex: /dehradun/i } });
    if (!dehradun) {
      dehradun = await CityModel.create({ name: 'Dehradun', state: 'Uttarakhand', isActive: true });
      console.log('Created Dehradun city:', dehradun._id);
    } else {
      console.log('Found Dehradun city:', dehradun._id);
    }

    // 2. Fetch all active services
    const services = await ServiceModel.find({});
    const serviceIds = services.map(s => s._id);
    console.log(`Found ${serviceIds.length} services`);

    // 3. Update existing "tata motor" partner if exists
    const tataPartner = await PartnerModel.findOne({ businessName: { $regex: /tata motor/i } });
    if (tataPartner) {
      tataPartner.cityId = dehradun._id as any;
      tataPartner.servicesOffered = serviceIds as any;
      tataPartner.location = {
        type: 'Point',
        coordinates: [78.0322, 30.3165] // Dehradun coordinates
      };
      tataPartner.businessAddress = 'ISBT Dehradun, Uttarakhand';
      tataPartner.isVerified = true;
      tataPartner.verificationStatus = 'APPROVED';
      await tataPartner.save();
      console.log('Updated tata motor partner with Dehradun cityId, services, and GPS location!');
    }

    // 4. Create or Update "Dehradun Auto Care" Partner
    const partnerEmail = 'dehradunpartner@carblink.com';
    const partnerPassword = 'Password@123';

    let user = await UserModel.findOne({ email: partnerEmail });
    if (!user) {
      user = await UserModel.create({
        fullName: 'Dehradun Auto Care Manager',
        email: partnerEmail,
        phone: '9876543210',
        password: partnerPassword,
        role: ROLES.PARTNER,
        isPhoneVerified: true,
        isEmailVerified: true,
        isActive: true,
      });
      console.log('User created:', user.email);
    }

    let partner = await PartnerModel.findOne({ userId: user._id });
    if (!partner) {
      partner = await PartnerModel.create({
        userId: user._id,
        businessName: 'Dehradun Auto Care',
        businessAddress: 'ISBT Road, Near Bus Stand, Dehradun',
        cityId: dehradun._id,
        servicesOffered: serviceIds,
        gstNumber: '05AAAAA0000A1Z5',
        isVerified: true,
        verificationStatus: 'APPROVED',
        rating: 4.8,
        totalReviews: 15,
        dailyCapacity: 10,
        location: {
          type: 'Point',
          coordinates: [78.0322, 30.3165] // Dehradun GPS coordinates
        }
      });
      console.log('Dehradun Auto Care Partner created!');
    } else {
      partner.cityId = dehradun._id as any;
      partner.servicesOffered = serviceIds as any;
      partner.location = {
        type: 'Point',
        coordinates: [78.0322, 30.3165]
      };
      partner.businessAddress = 'ISBT Road, Near Bus Stand, Dehradun';
      partner.isVerified = true;
      partner.verificationStatus = 'APPROVED';
      await partner.save();
      console.log('Dehradun Auto Care Partner updated!');
    }

    console.log('ALL PARTNERS UPDATED/SEEDED SUCCESSFULLY!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
