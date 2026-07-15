import { GarageModel, IGarage } from './garage.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { UnauthorizedError } from '../../../../common/errors/UnauthorizedError';

export class GarageService {
  public static async addVehicle(
    customerId: string,
    data: Partial<IGarage>
  ): Promise<IGarage> {
    const newVehicle = await GarageModel.create({
      ...data,
      customerId,
      isActive: true,
    });
    return newVehicle;
  }

  public static async getMyVehicles(customerId: string): Promise<IGarage[]> {
    return GarageModel.find({ customerId, isActive: true });
  }

  public static async updateVehicle(
    customerId: string,
    vehicleId: string,
    data: Partial<IGarage>
  ): Promise<IGarage> {
    const vehicle = await GarageModel.findOne({ _id: vehicleId, isActive: true });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (vehicle.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You do not own this vehicle');
    }

    // Do not allow updating customerId or isActive directly here
    delete data.customerId;
    delete data.isActive;

    Object.assign(vehicle, data);
    return vehicle.save();
  }

  public static async deleteVehicle(
    customerId: string,
    vehicleId: string
  ): Promise<{ success: boolean }> {
    const vehicle = await GarageModel.findOne({ _id: vehicleId, isActive: true });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    if (vehicle.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You do not own this vehicle');
    }

    vehicle.isActive = false;
    await vehicle.save();
    return { success: true };
  }
}
export default GarageService;
