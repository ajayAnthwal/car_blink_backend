import { JobModel } from '../jobs/job.model';
import { PartnerModel } from '../../partner.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';

export class EarningsService {
  public static async getMyEarnings(
    userId: string,
    query: { period?: 'today' | 'week' | 'month' }
  ): Promise<{ totalEarnings: number; period: string }> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    let startDate = new Date(0); // epoch start for lifetime/all-time
    const now = new Date();

    if (query.period === 'today') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
    } else if (query.period === 'week') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (query.period === 'month') {
      startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    const result = await JobModel.aggregate([
      {
        $match: {
          partnerId: partner._id,
          status: 'COMPLETED',
          completedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$finalAmount' },
        },
      },
    ]);

    const totalEarnings = result.length > 0 ? result[0].totalEarnings : 0;
    return { totalEarnings, period: query.period || 'all' };
  }

  public static async getEarningsSummary(
    userId: string
  ): Promise<{ lifetimeEarnings: number; completedJobsCount: number }> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    const [result, completedJobsCount] = await Promise.all([
      JobModel.aggregate([
        {
          $match: {
            partnerId: partner._id,
            status: 'COMPLETED',
          },
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$finalAmount' },
          },
        },
      ]),
      JobModel.countDocuments({ partnerId: partner._id, status: 'COMPLETED' }),
    ]);

    const lifetimeEarnings = result.length > 0 ? result[0].totalEarnings : 0;
    return { lifetimeEarnings, completedJobsCount };
  }
}
export default EarningsService;
