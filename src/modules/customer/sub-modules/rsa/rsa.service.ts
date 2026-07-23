import { RsaModel, IRsa } from './rsa.model';
import { GarageModel } from '../garage/garage.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { UnauthorizedError } from '../../../../common/errors/UnauthorizedError';
import { ApiError } from '../../../../common/errors/ApiError';
import { ERROR_CODES } from '../../../../common/constants/error-codes.constant';

export class RsaService {
  public static async requestAssistance(
    customerId: string,
    data: { vehicleId: string; issueType: string; location: { lat: number; lng: number } }
  ): Promise<IRsa> {
    const vehicle = await GarageModel.findOne({ _id: data.vehicleId, isActive: true });
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found in garage');
    }
    if (vehicle.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You do not own this vehicle');
    }

    const rsa = await RsaModel.create({
      customerId,
      vehicleId: data.vehicleId,
      issueType: data.issueType,
      location: data.location,
      status: 'PENDING',
    });

    return rsa;
  }

  public static async getStatus(customerId: string, rsaId: string): Promise<IRsa> {
    const rsa = await RsaModel.findById(rsaId).populate('assignedPartnerId');
    if (!rsa) {
      throw new NotFoundError('RSA request not found');
    }

    if (rsa.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You are not authorized to view this request');
    }

    return rsa;
  }

  public static async cancelRequest(customerId: string, rsaId: string): Promise<IRsa> {
    const rsa = await RsaModel.findById(rsaId);
    if (!rsa) {
      throw new NotFoundError('RSA request not found');
    }

    if (rsa.customerId.toString() !== customerId) {
      throw new UnauthorizedError('You are not authorized to cancel this request');
    }

    if (rsa.status === 'RESOLVED' || rsa.status === 'CANCELLED') {
      throw new ApiError(400, `Cannot cancel request in ${rsa.status} status`, ERROR_CODES.VALIDATION_ERROR);
    }

    rsa.status = 'CANCELLED';
    return rsa.save();
  }
}
export default RsaService;