import { SettlementModel, ISettlement } from '../../../accounts/sub-modules/settlements/settlement.model';

export class CommissionService {
  /**
   * Retrieve itemized list and total of all processed commissions
   */
  async getCommissionReport(
    fromDate: string,
    toDate: string,
    filters: { partnerId?: string } = {}
  ): Promise<{
    settlements: ISettlement[];
    totalCommission: number;
  }> {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    const queryFilter: any = {
      status: 'PROCESSED',
      createdAt: { $gte: start, $lte: end },
    };

    if (filters.partnerId) {
      queryFilter.partnerId = filters.partnerId;
    }

    const settlements = await SettlementModel.find(queryFilter)
      .populate({
        path: 'partnerId',
        select: 'businessName userId',
        populate: { path: 'userId', select: 'fullName' },
      })
      .populate('jobId')
      .sort({ createdAt: -1 });

    const totalCommission = settlements.reduce((acc, s) => acc + s.platformCommission, 0);

    return {
      settlements,
      totalCommission: Number(totalCommission.toFixed(2)),
    };
  }

  /**
   * Scoped commission audit for a specific partner
   */
  async getCommissionByPartner(
    partnerId: string,
    fromDate: string,
    toDate: string
  ): Promise<{
    settlements: ISettlement[];
    totalCommission: number;
  }> {
    return this.getCommissionReport(fromDate, toDate, { partnerId });
  }
}

export const commissionService = new CommissionService();
export default commissionService;
