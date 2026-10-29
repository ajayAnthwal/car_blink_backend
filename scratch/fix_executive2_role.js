require('dotenv').config();
const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await mongoose.connection.db.collection('users').updateOne(
    { email: 'executive2@carblink.com' },
    { $set: { role: 'EXECUTIVE' } }
  );
  console.log('Updated executive2 count:', result.modifiedCount);
  const updatedUser = await mongoose.connection.db.collection('users').findOne({ email: 'executive2@carblink.com' });
  console.log('Updated user record:', {
    email: updatedUser.email,
    role: updatedUser.role,
    customRoleId: updatedUser.customRoleId,
    isActive: updatedUser.isActive
  });
  await mongoose.disconnect();
}
fix().catch(err => {
  console.error(err);
  process.exit(1);
});
