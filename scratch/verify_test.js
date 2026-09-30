const mongoose = require('mongoose');
require('dotenv').config({ path: 'c:/Users/ajay anthwal/Desktop/car_blink_backend/.env' });

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const booking = await db.collection('bookings').findOne({ _id: new mongoose.Types.ObjectId('6abcba2a396af3d2731ee58d') });
  const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId('6abcb8f3396af3d2731ee2a1') });

  const bCustId = booking.customerId ? (typeof booking.customerId === 'object' && booking.customerId._id ? String(booking.customerId._id) : String(booking.customerId)) : '';
  const uId = String(user._id);

  console.log('Booking found:', !!booking);
  console.log('bCustId:', bCustId);
  console.log('uId:', uId);
  console.log('Does user own booking?', bCustId === uId);

  await mongoose.disconnect();
}
verify();
