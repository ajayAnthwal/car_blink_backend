const mongoose = require('mongoose');
const http = require('http');
require('dotenv').config();

async function run() {
  console.log('--- STARTING QUOTE FLOW INTEGRATION TEST ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carblink');

  const { LeadService } = require('../dist/modules/customer/sub-modules/lead/lead.service');
  const { otpStore } = require('../dist/modules/auth/strategies/otp.strategy');
  const { UserModel } = require('../dist/modules/user/user.model');
  const { GarageModel } = require('../dist/modules/customer/sub-modules/garage/garage.model');
  const { BookingModel } = require('../dist/modules/customer/sub-modules/booking/booking.model');

  const testPhone = '99999' + Math.floor(10000 + Math.random() * 90000);
  const testEmail = `quote_user_${Date.now()}@test.com`;

  console.log(`1. Sending OTP to ${testPhone}...`);
  const otpRes = await LeadService.sendLeadOtp(testPhone);
  console.log('OTP Send Result:', otpRes);

  const stored = otpStore ? otpStore.get(testPhone) : null;
  const otp = stored?.code || '123456';
  console.log(`2. Retrieved OTP from store: ${otp}`);

  console.log('3. Submitting quote with OTP verification & auto-registration...');
  const leadRes = await LeadService.createLead({
    name: 'Rohan Sharma',
    phone: testPhone,
    email: testEmail,
    source: 'WEBSITE_QUOTE',
    vehicleBrand: 'Maruti Suzuki',
    vehicleModel: 'Brezza',
    city: 'New Delhi, Delhi',
    message: 'Periodic Service | Fuel: PETROL | Vehicle No: DL 01 AB 9999',
    otp: otp,
    fuelType: 'PETROL',
    vehicleNumber: 'DL 01 AB 9999',
    services: ['Periodic Service'],
  });

  console.log('Lead Creation Result:');
  console.log('- Lead ID:', leadRes._id || leadRes.lead?._id);
  console.log('- User returned:', leadRes.user);
  console.log('- Access Token generated:', !!leadRes.tokens?.accessToken);
  console.log('- Refresh Token generated:', !!leadRes.tokens?.refreshToken);

  // Verify in MongoDB
  const customer = await UserModel.findOne({ phone: testPhone });
  console.log('4. MongoDB Customer check:', {
    found: !!customer,
    name: customer?.fullName,
    role: customer?.role,
    isPhoneVerified: customer?.isPhoneVerified
  });

  const garageVehicle = await GarageModel.findOne({ customerId: customer?._id });
  console.log('5. MongoDB Garage Vehicle check:', {
    found: !!garageVehicle,
    brand: garageVehicle?.brand,
    model: garageVehicle?.model,
    reg: garageVehicle?.registrationNumber
  });

  const booking = await BookingModel.findOne({ customerId: customer?._id });
  console.log('6. MongoDB Booking check:', {
    found: !!booking,
    bookingId: booking?._id,
    status: booking?.status,
    description: booking?.description
  });

  if (customer && customer.role === 'CUSTOMER' && customer.isPhoneVerified && garageVehicle && booking && leadRes.tokens?.accessToken) {
    console.log(' SUCCESS: Quote flow verified end-to-end! Account auto-registered, vehicle added to garage, booking created, and auth tokens generated.');
  } else {
    console.error('❌ FAILURE: Some checks failed!');
  }

  // Cleanup test records
  if (customer) {
    await UserModel.deleteOne({ _id: customer._id });
    await GarageModel.deleteMany({ customerId: customer._id });
    await BookingModel.deleteMany({ customerId: customer._id });
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Integration test error:', err);
  process.exit(1);
});
