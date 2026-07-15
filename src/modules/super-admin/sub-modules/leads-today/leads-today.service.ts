import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';

export class LeadsTodayService {
  /**
   * Get counts of today's bookings grouped by status, plus total count
   */
  async getTodaysLeadsStats(): Promise<{
    stats: Record<string, number>;
    total: number;
  }> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const counts = await BookingModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats: Record<string, number> = {};
    let total = 0;

    counts.forEach((item) => {
      if (item._id) {
        stats[item._id] = item.count;
        total += item.count;
      }
    });

    return { stats, total };
  }

  /**
   * Get paginated list of today's bookings
   */
  async getTodaysLeadsList(
    query: any = {}
  ): Promise<{ bookings: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const matchFilter = {
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    };

    const [bookings, total] = await Promise.all([
      BookingModel.find(matchFilter)
        .populate('customerId', 'fullName email phone')
        .populate('vehicleId')
        .populate('serviceId', 'name')
        .populate('cityId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BookingModel.countDocuments(matchFilter),
    ]);

    return { bookings, total, page, limit };
  }
}

export const leadsTodayService = new LeadsTodayService();
export default leadsTodayService;
