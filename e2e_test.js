require('dotenv').config();
const mongoose = require('mongoose');
const baseUrl = 'http://localhost:8000/api';

async function runTests() {
  console.log('--- STARTING E2E TEST ---');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const ServiceModel = mongoose.connection.collection('services');
  const CityModel = mongoose.connection.collection('cities');

  const service = await ServiceModel.findOne({});
  const city = await CityModel.findOne({});

  if (!service || !city) {
    console.error('Run seeds first!');
    process.exit(1);
  }

  const serviceId = service._id.toString();
  const cityId = city._id.toString();

  let customerToken = '';
  let vehicleId = '';
  const uniqueId = Date.now();

  console.log('\n1. Registering Customer...');
  let res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Test Customer', email: `cust${uniqueId}@test.com`, phone: `90${uniqueId.toString().slice(-8)}`, password: 'Password@123', role: 'CUSTOMER' })
  });
  let data = await res.json();
  if (!data.success) { console.error('Register failed:', data); process.exit(1); }
  console.log('Customer registered');

  console.log('\n2. Logging in Customer...');
  res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: `cust${uniqueId}@test.com`, password: 'Password@123' })
  });
  data = await res.json();
  if (!data.success) { console.error('Login failed:', data); process.exit(1); }
  customerToken = data.data.tokens.accessToken;
  console.log('Customer logged in');

  console.log('\n3. Adding Vehicle...');
  res = await fetch(`${baseUrl}/customer/garage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerToken}` },
    body: JSON.stringify({ brand: 'Honda', model: 'City', registrationNumber: `DL1C${uniqueId.toString().slice(-4)}`, fuelType: 'PETROL', year: 2020 })
  });
  data = await res.json();
  if (!data.success) { console.error('Add vehicle failed:', data); process.exit(1); }
  vehicleId = data.data._id;
  console.log('Vehicle added:', vehicleId);

  console.log('\n4. Creating Booking...');
  res = await fetch(`${baseUrl}/customer/bookings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerToken}` },
    body: JSON.stringify({ vehicleId, serviceId, cityId, description: 'Need urgent car wash and dent repair', preferredDate: new Date().toISOString() })
  });
  data = await res.json();
  if (!data.success) { console.error('Create booking failed:', data); process.exit(1); }
  const bookingId = data.data._id;
  console.log('Booking created:', bookingId);

  // Now register a partner to check leads
  console.log('\n5. Registering Partner...');
  res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Test Partner', email: `partner${uniqueId}@test.com`, phone: `80${uniqueId.toString().slice(-8)}`, password: 'Password@123', role: 'PARTNER' })
  });
  data = await res.json();
  if (!data.success) { console.error('Partner Register failed:', data); process.exit(1); }

  console.log('\n6. Logging in Partner...');
  res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: `partner${uniqueId}@test.com`, password: 'Password@123' })
  });
  data = await res.json();
  let partnerToken = data.data.tokens.accessToken;

  // The partner must create profile first to receive leads. Wait, let's see if we can create a profile.
  console.log('\n7. Creating Partner Profile...');
  res = await fetch(`${baseUrl}/partner/profile`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerToken}` },
    body: JSON.stringify({ businessName: 'Super Fix Garage', cityId, businessAddress: '123 Test St', location: { address: 'Delhi', coordinates: [77, 28] }, servicesOffered: [serviceId] })
  });
  data = await res.json();
  // We don't strictly care if it fails due to existing profile, but let's check
  console.log('Partner Profile result:', data.success ? 'Success' : data);

  // The super admin needs to verify the partner. We can do that via direct DB manipulation to speed things up!
  console.log('\n8. Auto-verifying Partner via DB...');
  const userId = data.data?.userId || (await mongoose.connection.collection('users').findOne({ email: `partner${uniqueId}@test.com` }))._id;
  await mongoose.connection.collection('partners').updateOne({ userId: new mongoose.Types.ObjectId(userId) }, { $set: { isVerified: true } });
  console.log('Partner verified');

  console.log('\n9. Checking Leads for Partner...');
  res = await fetch(`${baseUrl}/partner/leads`, {
    method: 'GET', headers: { 'Authorization': `Bearer ${partnerToken}` }
  });
  data = await res.json();
  const leads = data.data.bookings || [];
  console.log('Leads found:', leads.length);

  if (leads.length > 0) {
    const bookingLeadId = leads[0]._id;
    console.log('\n10. Partner placing bid...');
    res = await fetch(`${baseUrl}/partner/bids`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${partnerToken}` },
      body: JSON.stringify({ bookingId: bookingLeadId, quotedAmount: 5000, estimatedDuration: '2 hours', notes: 'We can fix it quickly.' })
    });
    data = await res.json();
    if (!data.success) { console.error('Bid failed:', data); process.exit(1); }
    const bidId = data.data._id;
    console.log('Bid placed successfully:', bidId);

    console.log('\n11. Customer getting quotes...');
    res = await fetch(`${baseUrl}/customer/bookings/${bookingLeadId}/quotes`, {
      method: 'GET', headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    data = await res.json();
    console.log('Quotes received by customer:', data.data?.length);

    console.log('\n12. Customer accepting bid...');
    res = await fetch(`${baseUrl}/customer/bookings/${bookingLeadId}/quotes`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customerToken}` },
      body: JSON.stringify({ bidId })
    });
    data = await res.json();
    if (!data.success) { console.error('Bid accept failed:', data); process.exit(1); }
    console.log('Bid accepted successfully! Booking Status:', data.data.status);
    console.log('Assigned Partner:', data.data.partnerId ? 'Yes' : 'No'); // Check if it's assigned to partner or if it waits for executive

  }

  console.log('\n--- TEST COMPLETE ---');
  process.exit(0);
}

runTests();
