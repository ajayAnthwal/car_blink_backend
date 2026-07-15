import { BookingModel } from '../../../customer/sub-modules/booking/booking.model';

export class MarketingService {
  /**
   * Aggregate bookings by cityId and sort descending
   */
  async getTopCities(limit: number = 5): Promise<{ city: string; count: number }[]> {
    const data = await BookingModel.aggregate([
      {
        $group: {
          _id: '$cityId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'cities',
          localField: '_id',
          foreignField: '_id',
          as: 'cityInfo',
        },
      },
      {
        $project: {
          city: { $arrayElemAt: ['$cityInfo.name', 0] },
          count: 1,
          _id: 0,
        },
      },
    ]);

    return data.map((item) => ({
      city: item.city || 'Unknown',
      count: item.count,
    }));
  }

  /**
   * Aggregate bookings by serviceId and sort descending
   */
  async getTopServices(limit: number = 5): Promise<{ service: string; count: number }[]> {
    const data = await BookingModel.aggregate([
      {
        $group: {
          _id: '$serviceId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'serviceInfo',
        },
      },
      {
        $project: {
          service: { $arrayElemAt: ['$serviceInfo.name', 0] },
          count: 1,
          _id: 0,
        },
      },
    ]);

    return data.map((item) => ({
      service: item.service || 'Unknown',
      count: item.count,
    }));
  }

  /**
   * Get basic customer retention metric: repeat vs one-time customers
   */
  async getCustomerRetention(): Promise<{
    repeatCustomers: number;
    oneTimeCustomers: number;
  }> {
    const data = await BookingModel.aggregate([
      {
        $group: {
          _id: '$customerId',
          bookingCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: {
            $cond: [{ $gt: ['$bookingCount', 1] }, 'REPEAT', 'ONE_TIME'],
          },
          count: { $sum: 1 },
        },
      },
    ]);

    let repeatCustomers = 0;
    let oneTimeCustomers = 0;

    data.forEach((item) => {
      if (item._id === 'REPEAT') {
        repeatCustomers = item.count;
      } else if (item._id === 'ONE_TIME') {
        oneTimeCustomers = item.count;
      }
    });

    return { repeatCustomers, oneTimeCustomers };
  }
}

export const marketingService = new MarketingService();
export default marketingService;
