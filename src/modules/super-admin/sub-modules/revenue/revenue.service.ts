import { PaymentModel } from '../../../payment/payment.model';
import { PAYMENT_STATUS } from '../../../../common/constants/status.constant';

export function resolveDateRange(
  period: string,
  fromDate?: string,
  toDate?: string
): { start: Date; end: Date } {
  const end = new Date();
  let start = new Date();

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(end.getDate() - 7);
      break;
    case 'month':
      start.setDate(end.getDate() - 30);
      break;
    case 'year':
      start.setDate(end.getDate() - 365);
      break;
    case 'custom':
      if (fromDate) start = new Date(fromDate);
      if (toDate) {
        const parsedTo = new Date(toDate);
        parsedTo.setHours(23, 59, 59, 999);
        return { start, end: parsedTo };
      }
      break;
    default:
      start.setDate(end.getDate() - 30);
      break;
  }

  return { start, end };
}

export class RevenueService {
  /**
   * Aggregate SUCCESS payments within a date range to generate financial summaries
   */
  async getRevenueSummary(
    period: 'today' | 'week' | 'month' | 'year' | 'custom',
    fromDate?: string,
    toDate?: string
  ): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    averageTransactionValue: number;
  }> {
    const { start, end } = resolveDateRange(period, fromDate, toDate);

    const stats = await PaymentModel.aggregate([
      {
        $match: {
          status: PAYMENT_STATUS.SUCCESS,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          averageTransactionValue: { $avg: '$amount' },
        },
      },
    ]);

    if (stats.length === 0) {
      return {
        totalRevenue: 0,
        totalTransactions: 0,
        averageTransactionValue: 0,
      };
    }

    return {
      totalRevenue: Number(stats[0].totalRevenue.toFixed(2)),
      totalTransactions: stats[0].totalTransactions,
      averageTransactionValue: Number(stats[0].averageTransactionValue.toFixed(2)),
    };
  }

  /**
   * Get revenue time-series aggregation trend by day, week, or month
   */
  async getRevenueTrend(
    period: 'today' | 'week' | 'month' | 'year' | 'custom',
    groupBy: 'day' | 'week' | 'month',
    fromDate?: string,
    toDate?: string
  ): Promise<{ date: string; amount: number }[]> {
    const { start, end } = resolveDateRange(period, fromDate, toDate);

    let groupFormat = '%Y-%m-%d';
    if (groupBy === 'week') {
      groupFormat = '%Y-W%U';
    } else if (groupBy === 'month') {
      groupFormat = '%Y-%m';
    }

    const trend = await PaymentModel.aggregate([
      {
        $match: {
          status: PAYMENT_STATUS.SUCCESS,
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return trend.map((t) => ({
      date: t._id,
      amount: Number(t.amount.toFixed(2)),
    }));
  }
}

export const revenueService = new RevenueService();
export default revenueService;
