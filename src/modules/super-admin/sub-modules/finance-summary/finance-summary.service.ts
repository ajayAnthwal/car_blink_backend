import { JobModel } from '../../../partner/sub-modules/jobs/job.model';
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
    growthRate: number;
  }> {
    const start = fromDate ? new Date(fromDate) : new Date('2020-01-01');
    const end = toDate ? new Date(toDate) : new Date();
    if (toDate) end.setHours(23, 59, 59, 999);

    // 1. Calculate total revenue (COMPLETED jobs)
    const revenueRes = await JobModel.aggregate([
      {
        $match: {
          status: 'COMPLETED',
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$finalAmount' },
        },
      },
    ]);

    // 1.5 Calculate monthly growth rate
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const thisMonthRev = await JobModel.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: thirtyDaysAgo, $lte: new Date() } } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } },
    ]);
    const lastMonthRev = await JobModel.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } },
    ]);

    const tmRevenue = thisMonthRev.length > 0 ? thisMonthRev[0].total : 0;
    const lmRevenue = lastMonthRev.length > 0 ? lastMonthRev[0].total : 0;
    let growthRate = 0;
    if (lmRevenue === 0) {
      growthRate = tmRevenue > 0 ? 100 : 0;
    } else {
      growthRate = ((tmRevenue - lmRevenue) / lmRevenue) * 100;
    }

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
      growthRate: Number(growthRate.toFixed(2)),
    };
  }
}

export const financeSummaryService = new FinanceSummaryService();
export default financeSummaryService;
