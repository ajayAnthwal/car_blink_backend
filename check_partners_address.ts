import mongoose from 'mongoose';
import { connectDatabase } from './src/config/database.config';
import { PartnerModel } from './src/modules/partner/partner.model';
import './src/modules/master-data/models/city.model';
import './src/modules/user/user.model';

const run = async () => {
  try {
    await connectDatabase();
    console.log('Connected to DB\n');

    const partners = await PartnerModel.find({})
      .populate('userId', 'fullName email phone')
      .populate('cityId', 'name state');

    console.log(`=== TOTAL PARTNERS IN DATABASE: ${partners.length} ===\n`);

    partners.forEach((p: any, idx: number) => {
      console.log(`PARTNER #${idx + 1}:`);
      console.log(`- ID: ${p._id}`);
      console.log(`- Business Name: ${p.businessName || 'N/A'}`);
      console.log(`- User Full Name: ${p.userId?.fullName || 'N/A'} (${p.userId?.email || 'N/A'})`);
      console.log(`- Business Address: "${p.businessAddress || 'NULL / EMPTY'}"`);
      console.log(`- City ID Linked: ${p.cityId?.name ? `${p.cityId.name}, ${p.cityId.state}` : 'NULL / UNLINKED'}`);
      console.log(`- Verification Status: ${p.verificationStatus}`);
      console.log(`- GPS Coordinates: ${p.location?.coordinates ? JSON.stringify(p.location.coordinates) : 'NONE'}`);
      console.log('--------------------------------------------------\n');
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
