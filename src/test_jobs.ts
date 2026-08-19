import mongoose from 'mongoose';
import { connectDatabase } from './config/database.config';

async function test() {
  await connectDatabase();
  console.log('Connected to MongoDB');

  const jobs = await mongoose.connection.db!.collection('jobs').find({}).toArray();
  console.log('Total Jobs in DB:', jobs.length);

  jobs.forEach((j: any) => {
    console.log('Job ID:', j._id, 'BookingId:', j.bookingId, 'Type of bookingId:', typeof j.bookingId, 'JobExtensions:', JSON.stringify(j.jobExtensions));
  });

  const targetBooking = await mongoose.connection.db!.collection('bookings').findOne({ _id: new mongoose.Types.ObjectId('6a848b233e68f13bfe234bf1') });
  console.log('Target Booking:', targetBooking);

  const users = await mongoose.connection.db!.collection('users').find({}).toArray();
  console.log('Users in DB:');
  users.forEach((u: any) => console.log('User ID:', u._id, 'Email:', u.email, 'Role:', u.role));

  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
