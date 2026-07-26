require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB remotely");

    // Let's import the actual settings model so we can query
    const GlobalSettingsSchema = new mongoose.Schema({
      platformCommissionRate: { type: Number, default: 15 },
      tdsRate: { type: Number, default: 1 },
      gstRate: { type: Number, default: 18 },
      supportEmail: { type: String, default: 'support@carblink.com' },
      supportPhone: { type: String, default: '1800-123-4567' },
      activeBanners: [{ type: String }],
      isBookingPaused: { type: Boolean, default: false },
    }, { strict: false });
    
    const GlobalSettingsModel = mongoose.models.GlobalSettings || mongoose.model('GlobalSettings', GlobalSettingsSchema);
    
    // Update the rate manually here to see if mongoose saves it!
    let settings = await GlobalSettingsModel.findOne();
    console.log("Current DB Settings before save:", settings);

    if (settings) {
      settings.platformCommissionRate = 12;
      await settings.save();
    }
    
    settings = await GlobalSettingsModel.findOne();
    console.log("Current DB Settings AFTER save:", settings);

    process.exit(0);
  } catch (err) {
    console.error(err);
  }
})();
