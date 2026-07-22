const mongoose = require('mongoose');
require('dotenv').config();

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB to seed data.");

  // Get users
  const users = await mongoose.connection.collection('users').find({
    role: { $in: ['CUSTOMER', 'PARTNER', 'EXECUTIVE'] }
  }).toArray();

  const customer = users.find(u => u.role === 'CUSTOMER');
  const partner = users.find(u => u.role === 'PARTNER');
  const executive = users.find(u => u.role === 'EXECUTIVE');

  if (customer) {
    console.log("Seeding customer data...");
    await mongoose.connection.collection('bookings').insertMany([
      { customerId: customer._id, status: 'COMPLETED', createdAt: new Date(Date.now() - 30 * 86400000) },
      { customerId: customer._id, status: 'IN_PROGRESS', createdAt: new Date() },
      { customerId: customer._id, status: 'QUOTED', createdAt: new Date() },
    ]);

    await mongoose.connection.collection('payments').insertMany([
      { customerId: customer._id, status: 'SUCCESS', amount: 5000, paidAt: new Date(Date.now() - 30 * 86400000), providerOrderId: 'order_' + Date.now() },
      { customerId: customer._id, status: 'SUCCESS', amount: 12000, paidAt: new Date(Date.now() - 60 * 86400000), providerOrderId: 'order_' + Date.now() + '1' },
    ]);

    await mongoose.connection.collection('warranties').insertMany([
      { customerId: customer._id, status: 'ACTIVE', expiresAt: new Date(Date.now() + 180 * 86400000) }
    ]);
  }

  if (partner) {
    console.log("Seeding partner data...");
    await mongoose.connection.collection('jobs').insertMany([
      { partnerId: partner._id, status: 'COMPLETED', finalAmount: 4000, completedAt: new Date(Date.now() - 10 * 86400000), createdAt: new Date(), bookingId: new mongoose.Types.ObjectId() },
      { partnerId: partner._id, status: 'IN_PROGRESS', createdAt: new Date(), bookingId: new mongoose.Types.ObjectId() }
    ]);

    await mongoose.connection.collection('partner_profiles').insertOne({
      userId: partner._id, businessName: 'AutoFix Pro', rating: 4.8, totalReviews: 124, verificationStatus: 'APPROVED'
    }).catch(e => console.log('profile exists'));
  }

  if (executive) {
    console.log("Seeding executive data...");
    await mongoose.connection.collection('leads').insertMany([
      { status: 'PENDING', createdAt: new Date() }, // today
      { status: 'QUOTED', createdAt: new Date() }, // today
      { status: 'IN_PROGRESS', createdAt: new Date(Date.now() - 86400000) }
    ]);

    await mongoose.connection.collection('escalations').insertMany([
      { status: 'OPEN', severity: 'CRITICAL', createdAt: new Date() },
      { status: 'OPEN', severity: 'HIGH', createdAt: new Date() },
      { status: 'IN_PROGRESS', severity: 'MEDIUM', createdAt: new Date() }
    ]);

    await mongoose.connection.collection('followups').insertMany([
      { status: 'PENDING', followUpDate: new Date() }
    ]);
  }

  console.log("Seeding complete.");
  process.exit(0);
}

seed();
