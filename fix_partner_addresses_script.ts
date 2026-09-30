import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/car_blink');
  const col = mongoose.connection.collection('partners');
  await col.updateMany(
    { businessName: 'Ravi' },
    { $set: { 
        businessAddress: 'Ravi Auto Care, Ballupur Chowk, Chakrata Road, Dehradun, Uttarakhand 248001',
        location: { type: 'Point', coordinates: [78.0089, 30.3341] }
      } 
    }
  );
  await col.updateMany(
    { businessName: 'Rajesh Sharma' },
    { $set: { 
        businessAddress: 'Sharma Motors, ISBT Bypass Road, Dehradun, Uttarakhand 248002',
        location: { type: 'Point', coordinates: [78.0322, 30.3165] }
      } 
    }
  );
  console.log('SUCCESSFULLY_UPDATED_PARTNER_LOCATIONS');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
