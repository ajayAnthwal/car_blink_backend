import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb+srv://techwebsofficial_db_user:techwebs%401234%23@cluster0.oxv4zfb.mongodb.net/carblink?retryWrites=true&w=majority&appName=Cluster0');
  const db = mongoose.connection.db;
  if (!db) {
    console.error('No DB connection');
    return;
  }
  const users = await db.collection('users').find({
    $or: [
      { phone: /5326$/ },
      { fullName: /5326/ }
    ]
  }).toArray();
  console.log('--- FOUND USERS ---');
  console.log(users.map(u => ({ id: u._id, name: u.fullName, phone: u.phone, email: u.email, role: u.role })));

  for (const u of users) {
    console.log(`\n=== CHECKING USER: ${u.fullName} (${u._id}) ===`);
    const notifs = await db.collection('notifications').find({ userId: u._id }).sort({ createdAt: -1 }).limit(5).toArray();
    console.log('NOTIFS:', notifs.map(n => ({ id: n._id, title: n.title, message: n.message, meta: n.metadata })));
    
    // Check by ObjectId customerId
    const bookings = await db.collection('bookings').find({
      $or: [
        { customerId: u._id },
        { customerId: u._id.toString() },
        { phone: u.phone },
        { phone: u.phone?.replace(/[^0-9]/g, '').slice(-10) }
      ]
    }).toArray();
    console.log('BOOKINGS:', bookings.map(b => ({
      id: b._id,
      customerId: b.customerId,
      status: b.status,
      serviceId: b.serviceId,
      vehicleId: b.vehicleId,
      cityId: b.cityId,
      forwardedBidIds: b.forwardedBidIds,
      createdAt: b.createdAt
    })));

    const bookingIds = bookings.map(b => b._id);
    const bids = await db.collection('bids').find({
      $or: [
        { bookingId: { $in: bookingIds } },
        { bookingId: { $in: bookingIds.map(id => id.toString()) } }
      ]
    }).toArray();
    console.log('BIDS:', bids.map(bi => ({
      id: bi._id,
      bookingId: bi.bookingId,
      partnerId: bi.partnerId,
      amount: bi.quotedAmount,
      status: bi.status
    })));
  }

  // Also check top 5 recent bookings in entire DB
  const recent = await db.collection('bookings').find().sort({ createdAt: -1 }).limit(5).toArray();
  console.log('\n--- 5 MOST RECENT BOOKINGS ACROSS ALL USERS ---');
  recent.forEach(r => {
    console.log({ id: r._id, customerId: r.customerId, phone: r.phone, status: r.status, createdAt: r.createdAt, forwardedBidIds: r.forwardedBidIds });
  });

  await mongoose.disconnect();
}

run().catch(console.error);
