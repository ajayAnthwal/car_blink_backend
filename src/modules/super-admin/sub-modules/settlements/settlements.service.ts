import { SettlementModel } from './settlement.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { PartnerModel } from '../../../partner/partner.model';

export class SuperAdminSettlementsService {
  async getAllSettlements(query: any) {
    const { page = 1, limit = 10, status } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = {};
    if (status) filter.status = status;

    const settlements = await SettlementModel.find(filter)
      .populate('partnerId', 'businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await SettlementModel.countDocuments(filter);

    return {
      docs: settlements,
      totalDocs: total,
      limit: Number(limit),
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  async createSettlement(data: any) {
    const partner = await PartnerModel.findById(data.partnerId);
    if (!partner) throw new NotFoundError('Partner not found');

    const settlement = await SettlementModel.create(data);
    return settlement;
  }

  async markAsPaid(id: string, transactionId: string, notes?: string) {
    const settlement = await SettlementModel.findById(id);
    if (!settlement) throw new NotFoundError('Settlement not found');

    settlement.status = 'PAID';
    settlement.transactionId = transactionId;
    if (notes) settlement.notes = notes;

    await settlement.save();
    return settlement;
  }
}

export const superAdminSettlementsService = new SuperAdminSettlementsService();
