import { GarageModel } from '../../../customer/sub-modules/garage/garage.model';

export class VehiclesService {
  public static async getAllVehicles(query: { page?: string; limit?: string }) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '50', 10));
    const skip = (page - 1) * limit;

    const [vehicles, total] = await Promise.all([
      GarageModel.find()
        .populate('customerId', 'fullName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      GarageModel.countDocuments()
    ]);

    return { vehicles, total, page, limit };
  }
}
export default VehiclesService;
