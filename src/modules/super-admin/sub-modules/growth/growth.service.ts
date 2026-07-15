import { UserModel } from '../../../user/user.model';
import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';
import { PartnerModel } from '../../../partner/partner.model';

export class GrowthService {
  /**
   * Aggregate User growth time-series data grouped by role (CUSTOMER vs PARTNER)
   */
  async getUserGrowth(
    fromDate: string,
    toDate: string,
    groupBy: 'day' | 'week' | 'month'
  ): Promise<{ date: string; CUSTOMER: number; PARTNER: number }[]> {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    let groupFormat = '%Y-%m-%d';
    if (groupBy === 'week') {
      groupFormat = '%Y-W%U';
    } else if (groupBy === 'month') {
      groupFormat = '%Y-%m';
    }

    const data = await UserModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: groupFormat, date: '$createdAt' } },
            role: '$role',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          roles: {
            $push: {
              k: '$_id.role',
              v: '$count',
            },
          },
        },
      },
      {
        $project: {
          date: '$_id',
          _id: 0,
          roleCounts: { $arrayToObject: '$roles' },
        },
      },
      { $sort: { date: 1 } },
    ]);

    return data.map((item) => ({
      date: item.date,
      CUSTOMER: item.roleCounts?.CUSTOMER || 0,
      PARTNER: item.roleCounts?.PARTNER || 0,
    }));
  }

  /**
   * Aggregate Booking growth time-series data
   */
  async getBookingGrowth(
    fromDate: string,
    toDate: string,
    groupBy: 'day' | 'week' | 'month'
  ): Promise<{ date: string; count: number }[]> {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    let groupFormat = '%Y-%m-%d';
    if (groupBy === 'week') {
      groupFormat = '%Y-W%U';
    } else if (groupBy === 'month') {
      groupFormat = '%Y-%m';
    }

    const data = await BookingModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return data.map((item) => ({
      date: item._id,
      count: item.count,
    }));
  }

  /**
   * Count partners by verificationStatus
   */
  async getPartnerVerificationFunnel(): Promise<{
    PENDING: number;
    UNDER_REVIEW: number;
    APPROVED: number;
    REJECTED: number;
  }> {
    const funnel = await PartnerModel.aggregate([
      {
        $group: {
          _id: '$verificationStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      PENDING: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0,
    };

    funnel.forEach((item) => {
      if (item._id && item._id in result) {
        result[item._id as keyof typeof result] = item.count;
      }
    });

    return result;
  }
}

export const growthService = new GrowthService();
export default growthService;
