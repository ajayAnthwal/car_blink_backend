import mongoose from 'mongoose';
import { connectDatabase } from '../../config/database.config';
import { CityModel } from '../../modules/master-data/models/city.model';
import { logger } from '../../config/logger.config';

const cities = [
  { name: 'Mumbai', state: 'Maharashtra' },
  { name: 'Delhi', state: 'Delhi' },
  { name: 'Bangalore', state: 'Karnataka' },
  { name: 'Hyderabad', state: 'Telangana' },
  { name: 'Ahmedabad', state: 'Gujarat' },
  { name: 'Chennai', state: 'Tamil Nadu' },
  { name: 'Kolkata', state: 'West Bengal' },
  { name: 'Surat', state: 'Gujarat' },
  { name: 'Pune', state: 'Maharashtra' },
  { name: 'Jaipur', state: 'Rajasthan' },
  { name: 'Lucknow', state: 'Uttar Pradesh' },
  { name: 'Kanpur', state: 'Uttar Pradesh' },
  { name: 'Nagpur', state: 'Maharashtra' },
  { name: 'Indore', state: 'Madhya Pradesh' },
  { name: 'Thane', state: 'Maharashtra' },
  { name: 'Bhopal', state: 'Madhya Pradesh' },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { name: 'Pimpri-Chinchwad', state: 'Maharashtra' },
  { name: 'Patna', state: 'Bihar' },
  { name: 'Vadodara', state: 'Gujarat' },
  { name: 'Ghaziabad', state: 'Uttar Pradesh' },
  { name: 'Ludhiana', state: 'Punjab' },
  { name: 'Coimbatore', state: 'Tamil Nadu' },
  { name: 'Agra', state: 'Uttar Pradesh' },
  { name: 'Madurai', state: 'Tamil Nadu' },
  { name: 'Gurugram', state: 'Haryana' },
  { name: 'Noida', state: 'Uttar Pradesh' }
];

const seedCities = async (): Promise<void> => {
  try {
    await connectDatabase();
    logger.info('Connected to database for seeding cities.');

    for (const city of cities) {
      await CityModel.findOneAndUpdate(
        { name: city.name },
        { $set: city },
        { upsert: true, new: true }
      );
      logger.info(`Seeded city: ${city.name}, ${city.state}`);
    }

    logger.info('Cities seeding completed successfully.');
    await mongoose.disconnect();
    logger.info('Disconnected from database.');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding cities:', error);
    process.exit(1);
  }
};

seedCities();
