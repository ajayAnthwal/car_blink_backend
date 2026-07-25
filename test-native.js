const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient('mongodb://127.0.0.1:27017');
  try {
    await client.connect();
    const db = client.db('carblink');
    const bookings = db.collection('bookings');
    
    const all = await bookings.find({}).toArray();
    console.log('Total bookings:', all.length);
    if(all.length > 0) {
      console.log('Sample booking:', JSON.stringify(all[0], null, 2));
    }
    
    const pending = await bookings.find({ status: { $in: ['PENDING', 'QUOTED'] } }).toArray();
    console.log('Pending/Quoted count:', pending.length);
    
    const pendingStr = await bookings.find({ status: 'PENDING' }).toArray();
    console.log('Pending string count:', pendingStr.length);
    
  } finally {
    await client.close();
  }
}
run().catch(console.error);
