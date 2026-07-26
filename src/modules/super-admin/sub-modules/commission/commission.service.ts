import { SettlementModel, ISettlement } from '../../../accounts/sub-modules/settlements/settlement.model';
import { PaymentModel } from '../../../payment/payment.model';
import { PAYMENT_STATUS } from '../../../../common/constants/status.constant';

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
      .populate({
        path: 'jobId',
        populate: { path: 'bookingId' }
      })
      .sort({ createdAt: -1 })
      .lean();

    const enhancedSettlements = await Promise.all(settlements.map(async (s: any) => {
      let cashCollected = 0;
      let onlinePaid = 0;

      if (s.jobId?.bookingId) {
        const payments = await PaymentModel.find({
          bookingId: s.jobId.bookingId._id || s.jobId.bookingId,
          status: PAYMENT_STATUS.SUCCESS
        }).lean();

        payments.forEach(p => {
          if (p.provider === 'CASH') cashCollected += p.amount;
          else onlinePaid += p.amount;
        });
      }

      return {
        ...s,
        cashCollected,
        onlinePaid
      };
    }));

    const totalCommission = enhancedSettlements.reduce((acc, s) => acc + s.platformCommission, 0);

    return {
      settlements: enhancedSettlements as any,
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
