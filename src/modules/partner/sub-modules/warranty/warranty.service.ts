import { WarrantyModel, IWarranty } from '../../../customer/sub-modules/warranty/warranty.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { BadRequestError } from '../../../../common/errors/BadRequestError';
import mongoose from 'mongoose';

export class PartnerWarrantyService {
  public static async issueWarranty(
    partnerId: string,
    data: {
      bookingId: string;
      customerId: string;
      warrantyPeriodMonths: number;
      startDate: Date;
      warrantyDocumentUrl?: string;
    }
  ): Promise<IWarranty> {
    const { bookingId, customerId, warrantyPeriodMonths, startDate, warrantyDocumentUrl } = data;
    
    const existingWarranty = await WarrantyModel.findOne({ bookingId, customerId, partnerId });
    if (existingWarranty) {
      throw new BadRequestError('Warranty for this booking has already been issued.');
    }

    const warranty = new WarrantyModel({
      bookingId,
      customerId,
      partnerId,
      warrantyPeriodMonths,
      startDate,
      warrantyDocumentUrl,
      status: 'ACTIVE',
    });

    await warranty.save();
    return warranty;
  }

  public static async getIssuedWarranties(
    partnerId: string,
    query: { page?: string; limit?: string }
  ): Promise<{ warranties: IWarranty[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const filter = { partnerId };
    const [warranties, total] = await Promise.all([
      WarrantyModel.find(filter)
        .populate({
          path: 'bookingId',
          populate: [
            { path: 'vehicleId' },
            { path: 'serviceId' }
          ]
        })
        .populate('customerId', 'firstName lastName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WarrantyModel.countDocuments(filter),
    ]);

    return { warranties, total, page, limit };
  }
}
export default PartnerWarrantyService;
