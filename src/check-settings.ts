(async () => {
  console.log("Checking DB directly instead...");
  const mongoose = require('mongoose');
  await mongoose.connect('mongodb://127.0.0.1:27017/carblink');
  console.log("Connected to MongoDB");

  const GlobalSettingsModel = mongoose.model('GlobalSettings', new mongoose.Schema({}, { strict: false }));
  const settings = await GlobalSettingsModel.findOne();
  console.log("Current Settings:", settings);
  
  process.exit(0);
})();
