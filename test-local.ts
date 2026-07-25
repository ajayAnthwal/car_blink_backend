import mongoose from 'mongoose';
import { connectDatabase } from './src/config/database.config';
import { BookingModel } from './src/modules/customer/sub-modules/booking/booking.model';

connectDatabase().then(async () => {
  const pending = await BookingModel.find({ status: { $in: ['PENDING', 'QUOTED'] } });
  console.log('Pending count:', pending.length);
  
  const all = await BookingModel.find({});
  console.log('All count:', all.length);
  if(all.length > 0) {
    console.log('Statuses:', all.map((b: any) => b.status).join(', '));
  }
  process.exit(0);
}).catch(console.error);
