import mongoose from 'mongoose';

const run = async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/carblink');
  const db = mongoose.connection.db;
  const bookings = db.collection('bookings');
  
  const all = await bookings.find({}).toArray();
  console.log('Total bookings:', all.length);
  
  if (all.length > 0) {
    console.log('Sample booking status:', all[0].status);
  }

  const pending = await bookings.find({ status: { $in: ['PENDING', 'QUOTED'] } }).toArray();
  console.log('Pending/Quoted:', pending.length);
  
  process.exit(0);
};

run();
