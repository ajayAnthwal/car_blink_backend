const mongoose = require("mongoose");
require("dotenv").config({ path: ".env" });

const CitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  state: { type: String, required: true },
  isActive: { type: Boolean, default: true }
});

const CityModel = mongoose.models.City || mongoose.model("City", CitySchema);

async function seedCities() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/carblink");
    console.log("Connected to MongoDB");

    const newCities = [
      { name: "Dehradun", state: "Uttarakhand", isActive: true },
      { name: "Haridwar", state: "Uttarakhand", isActive: true },
      { name: "Haldwani", state: "Uttarakhand", isActive: true },
      { name: "Roorkee", state: "Uttarakhand", isActive: true },
      { name: "Rishikesh", state: "Uttarakhand", isActive: true },
      { name: "Nainital", state: "Uttarakhand", isActive: true },
      { name: "Kashipur", state: "Uttarakhand", isActive: true }
    ];

    for (const city of newCities) {
      const exists = await CityModel.findOne({ name: city.name, state: city.state });
      if (!exists) {
        await CityModel.create(city);
        console.log(`Inserted city: ${city.name}`);
      } else {
        console.log(`City already exists: ${city.name}`);
      }
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding cities:", error);
    process.exit(1);
  }
}

seedCities();
