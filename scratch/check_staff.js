require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const roles = await mongoose.connection.db.collection('customroles').find({}).toArray();
  console.log('CustomRoles count:', roles.length);
  roles.forEach(r => console.log('Role:', r.name, r._id));
  const staff = await mongoose.connection.db.collection('users').find({ role: { $in: ['ADMIN', 'SUPER_ADMIN'] } }).toArray();
  console.log('Staff count:', staff.length);
  staff.forEach(s => console.log('Staff:', s.fullName, s.email, s.phone, s.role, s.customRoleId));
  await mongoose.disconnect();
}
check().catch(err => {
  console.error(err);
  process.exit(1);
});
