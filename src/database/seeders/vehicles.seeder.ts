import mongoose from 'mongoose';
import { connectDatabase } from '../../config/database.config';
import { VehicleBrandModel, VehicleModelModel } from '../../modules/master-data/models/vehicle.model';
import { logger } from '../../config/logger.config';

const seedVehicles = async () => {
  try {
    await connectDatabase();
    
    // Clear existing to avoid duplicates if run multiple times without proper logic
    await VehicleBrandModel.deleteMany({});
    await VehicleModelModel.deleteMany({});

    const brand = await VehicleBrandModel.create({ name: 'Maruti Suzuki', logo: 'logo_url' });
    await VehicleModelModel.create({ brandId: brand._id, name: 'Swift' });
    await VehicleModelModel.create({ brandId: brand._id, name: 'Baleno' });

    const brand2 = await VehicleBrandModel.create({ name: 'Hyundai', logo: 'logo_url' });
    await VehicleModelModel.create({ brandId: brand2._id, name: 'i20' });
    await VehicleModelModel.create({ brandId: brand2._id, name: 'Creta' });

    const brand3 = await VehicleBrandModel.create({ name: 'Tata', logo: 'logo_url' });
    await VehicleModelModel.create({ brandId: brand3._id, name: 'Nexon' });
    await VehicleModelModel.create({ brandId: brand3._id, name: 'Harrier' });

    logger.info('Vehicles seeded successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding vehicles', error);
    process.exit(1);
  }
};

seedVehicles();
