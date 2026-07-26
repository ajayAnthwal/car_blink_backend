const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb+srv://techwebsofficial_db_user:techwebs%401234%23@cluster0.oxv4zfb.mongodb.net/carblink?retryWrites=true&w=majority');
  
  // get the user manually and do the same query as earnings.service
  const partner = await mongoose.connection.db.collection('partners').findOne({ userId: new mongoose.Types.ObjectId('6a6396e54d7f9adf5ef4445c') });
  console.log("Partner ID:", partner._id);

  let startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  console.log("StartDate:", startDate);

  const jobs = await mongoose.connection.db.collection('jobs').find({
    partnerId: partner._id,
    status: 'COMPLETED',
    completedAt: { $gte: startDate }
  }).toArray();

  console.log("Found jobs length:", jobs.length);
  
  if (jobs.length > 0) {
     console.log("Final Amount:", jobs[0].finalAmount);
  }

  process.exit();
}

test();
