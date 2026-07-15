import { WarrantyModel, IWarranty } from './warranty.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { UnauthorizedError } from '../../../../common/errors/UnauthorizedError';

export class WarrantyService {
  public static async getMyWarranties(
    customerId: string,
    query: { page?: string; limit?: string }
  ): Promise<{ warranties: IWarranty[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter = { customerId };
    const [warranties, total] = await Promise.all([
      WarrantyModel.find(filter)
        .populate({
          path: 'bookingId',
          populate: [
            { path: 'vehicleId' },
            { path: 'serviceId' }
          ]
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WarrantyModel.countDocuments(filter),
    ]);

    return { warranties, total, page, limit };
  }

  public static async getWarrantyById(customerId: string, warrantyId: string): Promise<IWarranty> {
    const warranty = await WarrantyModel.findById(warrantyId).populate({
      path: 'bookingId',
      populate: [
        { path: 'vehicleId' },
        { path: 'serviceId' }
      ]
    });

    if (!warranty) {
      throw new NotFoundError('Warranty not found');
    }

    if (warranty.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You are not authorized to view this warranty');
    }

    return warranty;
  }
}
export default WarrantyService;
