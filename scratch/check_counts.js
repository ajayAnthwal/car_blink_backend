require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const State = mongoose.model('State', new mongoose.Schema({}, { strict: false }));
  const City = mongoose.model('City', new mongoose.Schema({}, { strict: false }));

  const stateCount = await State.countDocuments();
  const cityCount = await City.countDocuments();
  const linkedCities = await City.countDocuments({ stateId: { $exists: true, $ne: null } });

  console.log('States in DB:', stateCount);
  console.log('Cities in DB:', cityCount);
  console.log('Cities with stateId:', linkedCities);

  const sampleState = await State.findOne();
  console.log('Sample State:', sampleState?.name, sampleState?.code);

  const sampleCity = await City.findOne({ stateId: { $exists: true } });
  console.log('Sample City:', sampleCity?.name, '-> State:', sampleCity?.state, 'StateId:', sampleCity?.stateId);

  await mongoose.disconnect();
}

check().catch(console.error);
