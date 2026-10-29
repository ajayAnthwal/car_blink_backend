require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await mongoose.connection.db.collection('users').find({
    $or: [
      { email: /executive/i },
      { fullName: /executive/i }
    ]
  }).toArray();
  console.log('Found users:', users.length);
  users.forEach(u => {
    console.log({
      _id: u._id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      customRoleId: u.customRoleId,
      isActive: u.isActive
    });
  });
  await mongoose.disconnect();
}
check().catch(console.error);
