import mongoose from 'mongoose';
import { JobModel } from '../jobs/job.model';
import { PartnerModel } from '../../partner.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';
import { PaymentModel } from '../../../payment/payment.model';

export class EarningsService {
  public static async getMyEarnings(
    userId: string,
    query: { period?: 'today' | 'week' | 'month' }
  ): Promise<{ totalEarnings: number; cashCollected: number; onlineEarnings: number; transactions: any[]; period: string }> {
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

    const jobs = await JobModel.find({
      partnerId: partner._id,
      status: 'COMPLETED',
      completedAt: { $gte: startDate },
    }).lean();
    console.log(`[EARNINGS] partnerId: ${partner._id}, startDate: ${startDate}, found jobs: ${jobs.length}`);

    const totalEarnings = jobs.reduce((sum, job) => sum + (job.finalAmount || 0), 0);

    const bookingIds = jobs.map(j => j.bookingId);
    const payments = await PaymentModel.find({
      bookingId: { $in: bookingIds },
      status: 'SUCCESS'
    }).lean();

    let cashCollected = 0;
    let onlineEarnings = 0;

    const transactions = payments.map(p => {
      if (p.provider === 'CASH') cashCollected += p.amount;
      else onlineEarnings += p.amount;

      return {
        jobId: jobs.find(j => j.bookingId.toString() === p.bookingId.toString())?._id,
        amount: p.amount,
        paymentType: p.paymentType,
        provider: p.provider,
        createdAt: p.paidAt || p.createdAt
      };
    });

    return { totalEarnings, cashCollected, onlineEarnings, transactions, period: query.period || 'all' };
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
