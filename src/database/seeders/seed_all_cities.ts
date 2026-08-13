import mongoose from 'mongoose';
import { State, City } from "country-state-city";
import { connectDatabase } from '../../config/database.config';
import { CityModel } from '../../modules/master-data/models/city.model';
import { logger } from '../../config/logger.config';

const seedAllCities = async (): Promise<void> => {
  try {
    await connectDatabase();
    logger.info('Connected to database for seeding ALL Indian cities.');

    const states = State.getStatesOfCountry('IN');
    logger.info(`Found ${states.length} states in India.`);

    const allCitiesToInsert = [];
    const seenNames = new Set<string>();

    for (const state of states) {
      const cities = City.getCitiesOfState('IN', state.isoCode);
      for (const city of cities) {
        if (!seenNames.has(city.name)) {
          seenNames.add(city.name);
          allCitiesToInsert.push({
            name: city.name,
            state: state.name,
            isActive: true
          });
        }
      }
    }

    logger.info(`Total cities to seed: ${allCitiesToInsert.length}`);

    // Clean existing collection first to avoid duplicates or use insertMany
    await CityModel.deleteMany({});
    
    // Insert all in batches if necessary, but 4000 docs is fine for insertMany
    await CityModel.insertMany(allCitiesToInsert);

    logger.info('All Indian Cities seeding completed successfully.');
    await mongoose.disconnect();
    logger.info('Disconnected from database.');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding all cities:', error);
    process.exit(1);
  }
};

seedAllCities();
