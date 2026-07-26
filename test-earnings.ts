const mongoose = require('mongoose');
const { EarningsService } = require('./src/modules/partner/sub-modules/earnings/earnings.service.ts');

async function test() {
  await mongoose.connect('mongodb+srv://techwebsofficial_db_user:techwebs%401234%23@cluster0.oxv4zfb.mongodb.net/carblink?retryWrites=true&w=majority');
  const res = await EarningsService.getMyEarnings('6a6396e54d7f9adf5ef4445c', {period: 'month'});
  console.log('RESULT:', JSON.stringify(res, null, 2));
  process.exit();
}

test();
