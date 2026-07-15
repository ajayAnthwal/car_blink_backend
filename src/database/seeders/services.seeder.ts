import mongoose from 'mongoose';
import { connectDatabase } from '../../config/database.config';
import { ServiceModel } from '../../modules/master-data/models/service.model';
import { logger } from '../../config/logger.config';

const services = [
  { name: 'Periodic Service', icon: 'periodic_service_icon_key', category: 'Maintenance' },
  { name: 'Engine Repair', icon: 'engine_repair_icon_key', category: 'Repair' },
  { name: 'Dent & Paint', icon: 'dent_paint_icon_key', category: 'Bodywork' },
  { name: 'Car Wash', icon: 'car_wash_icon_key', category: 'Cleaning' },
  { name: 'Detailing', icon: 'detailing_icon_key', category: 'Cleaning' },
  { name: 'PPF', icon: 'ppf_icon_key', category: 'Protection' },
  { name: 'Ceramic Coating', icon: 'ceramic_coating_icon_key', category: 'Protection' },
  { name: 'Tyres', icon: 'tyres_icon_key', category: 'Maintenance' },
  { name: 'Battery', icon: 'battery_icon_key', category: 'Maintenance' },
  { name: 'AC Repair', icon: 'ac_repair_icon_key', category: 'Repair' },
  { name: 'Suspension', icon: 'suspension_icon_key', category: 'Repair' },
  { name: 'Insurance Claims', icon: 'insurance_claims_icon_key', category: 'Admin' },
  { name: 'Clutch Repair', icon: 'clutch_repair_icon_key', category: 'Repair' },
  { name: 'Brake Service', icon: 'brake_service_icon_key', category: 'Repair' }
];

const seedServices = async (): Promise<void> => {
  try {
    await connectDatabase();
    logger.info('Connected to database for seeding services.');

    for (const service of services) {
      await ServiceModel.findOneAndUpdate(
        { name: service.name },
        { $set: service },
        { upsert: true, new: true }
      );
      logger.info(`Seeded service: ${service.name}`);
    }

    logger.info('Services seeding completed successfully.');
    await mongoose.disconnect();
    logger.info('Disconnected from database.');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding services:', error);
    process.exit(1);
  }
};

seedServices();
