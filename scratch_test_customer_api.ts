import mongoose from 'mongoose';
import { generateAccessToken } from './src/modules/auth/strategies/jwt.strategy';

async function testCustomerBookingsCall() {
  await mongoose.connect('mongodb+srv://techwebsofficial_db_user:techwebs%401234%23@cluster0.oxv4zfb.mongodb.net/carblink?retryWrites=true&w=majority&appName=Cluster0');
  const db = mongoose.connection.db;
  if (!db) return;

  const user = await db.collection('users').findOne({ phone: '7078235326' });
  console.log('Customer User:', user?._id, user?.fullName, user?.role);

  if (!user) {
    console.log('User not found');
    await mongoose.disconnect();
    return;
  }

  // Generate token for this user
  const token = generateAccessToken({ userId: user._id.toString(), role: user.role });
  console.log('Generated Token for 7078235326');

  // Hit backend API
  const res = await fetch('http://localhost:8000/api/customer/bookings', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const json = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('API Response:', JSON.stringify(json, null, 2));

  // Also test quotes endpoint for their booking
  if (json.data?.bookings?.length > 0) {
    const bId = json.data.bookings[0]._id;
    console.log('\nTesting Quotes for Booking:', bId);
    const quoteRes = await fetch(`http://localhost:8000/api/customer/bookings/${bId}/quotes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const quoteJson = await quoteRes.json();
    console.log('Quote API Status:', quoteRes.status);
    console.log('Quote API Response:', JSON.stringify(quoteJson, null, 2));
  }

  await mongoose.disconnect();
}

testCustomerBookingsCall().catch(console.error);
