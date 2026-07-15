import { PaymentModel } from '../../../payment/payment.model';
import { RefundModel } from '../../../accounts/sub-modules/refunds/refund.model';
import { SettlementModel } from '../../../accounts/sub-modules/settlements/settlement.model';
import { PAYMENT_STATUS } from '../../../../common/constants/status.constant';

export class FinanceSummaryService {
  /**
   * Consolidated financial view (Total revenue, refunds, partner payouts, and platform commissions)
   */
  async getFinanceSummary(
    fromDate: string,
    toDate: string
  ): Promise<{
    totalRevenue: number;
    totalRefunds: number;
    totalPayouts: number;
    netPlatformRevenue: number;
  }> {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    // 1. Calculate total revenue (SUCCESS payments)
    const revenueRes = await PaymentModel.aggregate([
      {
        $match: {
          status: PAYMENT_STATUS.SUCCESS,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    // 2. Calculate total refunds (PROCESSED refunds)
    const refundsRes = await RefundModel.aggregate([
      {
        $match: {
          status: 'PROCESSED',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    // 3. Calculate total payouts & platform commissions (PROCESSED settlements)
    const settlementsRes = await SettlementModel.aggregate([
      {
        $match: {
          status: 'PROCESSED',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalPayouts: { $sum: '$netPayoutAmount' },
          totalCommissions: { $sum: '$platformCommission' },
        },
      },
    ]);

    const totalRevenue = revenueRes.length > 0 ? revenueRes[0].total : 0;
    const totalRefunds = refundsRes.length > 0 ? refundsRes[0].total : 0;
    const totalPayouts = settlementsRes.length > 0 ? settlementsRes[0].totalPayouts : 0;
    const netPlatformRevenue =
      settlementsRes.length > 0 ? settlementsRes[0].totalCommissions : 0;

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalRefunds: Number(totalRefunds.toFixed(2)),
      totalPayouts: Number(totalPayouts.toFixed(2)),
      netPlatformRevenue: Number(netPlatformRevenue.toFixed(2)),
    };
  }
}

export const financeSummaryService = new FinanceSummaryService();
export default financeSummaryService;
