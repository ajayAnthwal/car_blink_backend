require('dotenv').config();
const mongoose = require('mongoose');

async function linkAllFast() {
  await mongoose.connect(process.env.MONGODB_URI);
  const State = mongoose.model('State', new mongoose.Schema({}, { strict: false }));
  const City = mongoose.model('City', new mongoose.Schema({}, { strict: false }));

  const states = await State.find();
  console.log(`Processing ${states.length} states with bulk updateMany...`);

  for (const state of states) {
    const res = await City.updateMany(
      {
        stateId: { $exists: false },
        state: { $regex: new RegExp(`^${state.name.trim()}$`, 'i') }
      },
      { $set: { stateId: state._id } }
    );
    if (res.modifiedCount > 0) {
      console.log(`Linked ${res.modifiedCount} cities to ${state.name}`);
    }
  }

  const finalLinked = await City.countDocuments({ stateId: { $exists: true, $ne: null } });
  const totalCities = await City.countDocuments();
  console.log(`\nDONE: ${finalLinked} out of ${totalCities} cities now have verified stateId links!`);

  await mongoose.disconnect();
}

linkAllFast().catch(console.error);
