import mongoose from 'mongoose';
import { UserModel } from '../user/user.model';
import { BookingModel } from '../customer/sub-modules/booking/booking.model';
import { PartnerModel } from '../partner/partner.model';
import { CityModel } from '../master-data/models/city.model';
import { BidModel } from '../partner/sub-modules/bidding/bid.model';
import { JobModel } from '../partner/sub-modules/jobs/job.model';
import { KycDocumentModel } from '../partner/sub-modules/kyc/kyc.model';
import { emitToUser, emitToRole } from '../../sockets';
import { ROLES } from '../../common/constants/roles.constant';
import { BOOKING_STATUS } from '../../common/constants/status.constant';

export class ExecutiveService {
  /**
   * Get aggregated status overview for customers (paginated)
   */
  async getCustomerStatusOverview(query: any = {}): Promise<any> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const matchUser: any = { role: ROLES.CUSTOMER };

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      matchUser.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    // First find matching customer users
    const customers = await UserModel.find(matchUser)
      .select('fullName email phone isActive isPhoneVerified isEmailVerified createdAt')
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await UserModel.countDocuments(matchUser);

    const customerIds = customers.map((c) => c._id);

    // Aggregate booking stats for these customer IDs
    const bookingStats = await BookingModel.aggregate([
      { $match: { customerId: { $in: customerIds } } },
      {
        $group: {
          _id: '$customerId',
          totalBookings: { $sum: 1 },
          activeBookings: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$status', BOOKING_STATUS.COMPLETED] },
                    { $ne: ['$status', BOOKING_STATUS.CANCELLED] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          lastBookingDate: { $max: '$createdAt' },
        },
      },
    ]);

    const statsMap = new Map();
    bookingStats.forEach((stat) => {
      statsMap.set(stat._id.toString(), stat);
    });

    const customersWithStats = customers.map((customer) => {
      const stats = statsMap.get(customer._id.toString()) || {
        totalBookings: 0,
        activeBookings: 0,
        lastBookingDate: null,
      };
      return {
        ...customer,
        status: customer.isActive ? 'ACTIVE' : 'INACTIVE',
        isVerified: customer.isPhoneVerified && customer.isEmailVerified,
        totalBookings: stats.totalBookings,
        activeBookings: stats.activeBookings,
        lastBookingDate: stats.lastBookingDate,
      };
    });

    return {
      customers: customersWithStats,
      total,
      page,
      limit,
    };
  }

  /**
   * Get aggregated status overview for partners (paginated)
   */
  async getPartnerStatusOverview(query: any = {}): Promise<any> {
    const partnerFilter: any = {};
    if (query.cityId && mongoose.Types.ObjectId.isValid(query.cityId)) {
      try {
        const cityDoc = await CityModel.findById(query.cityId);
        const cityName = cityDoc?.name || '';
        if (cityName) {
          const cityRegex = new RegExp(cityName, 'i');
          partnerFilter.$or = [
            { cityId: new mongoose.Types.ObjectId(query.cityId) },
            { businessAddress: cityRegex },
            { businessName: cityRegex }
          ];
        } else {
          partnerFilter.cityId = new mongoose.Types.ObjectId(query.cityId);
        }
      } catch (_e) {
        partnerFilter.cityId = new mongoose.Types.ObjectId(query.cityId);
      }
    }

    if (query.verificationStatus) {
      partnerFilter.verificationStatus = query.verificationStatus;
    }
    
    if (query.status) {
      partnerFilter.status = query.status;
    }

    if (query.serviceId && mongoose.Types.ObjectId.isValid(query.serviceId)) {
      partnerFilter.servicesOffered = new mongoose.Types.ObjectId(query.serviceId);
    }

    // Geo-spatial filtering:
    const hasGeoFilter = query.lat && query.lng && query.radius;
    if (hasGeoFilter) {
      const radiusKm = parseFloat(query.radius);
      const radiusRadians = radiusKm / 6378.1;
      partnerFilter.location = {
        $geoWithin: {
          $centerSphere: [
            [parseFloat(query.lng), parseFloat(query.lat)],
            radiusRadians
          ]
        }
      };
    }

    if (query.search) {
      const rawSearch = String(query.search).trim();
      const searchTerms = rawSearch.split(/[\s|,]+/).filter(term => term.length > 2);
      const searchRegexes = (searchTerms.length > 0 ? searchTerms : [rawSearch]).map(term => new RegExp(term, 'i'));
      
      const matchingUsers = await UserModel.find({
        role: ROLES.PARTNER,
        $or: searchRegexes.flatMap(regex => [
          { fullName: regex },
          { email: regex },
          { phone: regex },
        ]),
      }).select('_id');
      const userIds = matchingUsers.map((u) => u._id);

      const orConditions: any[] = [
        ...searchRegexes.flatMap(regex => [
          { businessName: regex },
          { businessAddress: regex },
        ]),
      ];
      if (userIds.length > 0) {
        orConditions.push({ userId: { $in: userIds } });
      }

      if (partnerFilter.$or) {
        partnerFilter.$and = [
          { $or: partnerFilter.$or },
          { $or: orConditions }
        ];
        delete partnerFilter.$or;
      } else {
        partnerFilter.$or = orConditions;
      }
    }

    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    // Graceful fallback: if geo filter causes an error (partner has no location set),
    // retry without geo filter (city-level results)
    let partners: any[] = [];
    let total = 0;
    try {
      [partners, total] = await Promise.all([
        PartnerModel.find(partnerFilter)
          .populate('userId', 'fullName email phone')
          .populate('cityId', 'name state')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PartnerModel.countDocuments(partnerFilter),
      ]);
    } catch (geoError: any) {
      // Geo query failed — fallback to city-only filter without location constraint
      const { logger } = require('../../config/logger.config');
      logger.warn('Geo filter failed, falling back to city filter:', geoError?.message);
      const fallbackFilter = { ...partnerFilter };
      delete fallbackFilter.location;
      [partners, total] = await Promise.all([
        PartnerModel.find(fallbackFilter)
          .populate('userId', 'fullName email phone')
          .populate('cityId', 'name state')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PartnerModel.countDocuments(fallbackFilter),
      ]);
    }

    const partnerIds = partners.map((p) => p._id);

    // Aggregate job stats for these partner IDs
    const jobStats = await JobModel.aggregate([
      {
        $match: {
          partnerId: { $in: partnerIds },
          status: 'COMPLETED',
        },
      },
      {
        $group: {
          _id: '$partnerId',
          completedJobsCount: { $sum: 1 },
        },
      },
    ]);

    // Aggregate bid stats for these partner IDs
    const bidStats = await BidModel.aggregate([
      {
        $match: {
          partnerId: { $in: partnerIds },
          status: 'PENDING',
        },
      },
      {
        $group: {
          _id: '$partnerId',
          activeBidsCount: { $sum: 1 },
        },
      },
    ]);

    const jobStatsMap = new Map();
    jobStats.forEach((stat) => jobStatsMap.set(stat._id.toString(), stat.completedJobsCount));

    const bidStatsMap = new Map();
    bidStats.forEach((stat) => bidStatsMap.set(stat._id.toString(), stat.activeBidsCount));

    const kycDocs = await KycDocumentModel.find({ partnerId: { $in: partnerIds } }).lean();
    const kycDocsMap = new Map();
    kycDocs.forEach((doc: any) => {
      const pid = doc.partnerId.toString();
      if (!kycDocsMap.has(pid)) kycDocsMap.set(pid, []);
      kycDocsMap.get(pid).push(doc);
    });

    const partnersWithStats = partners.map((partner) => {
      return {
        ...partner,
        totalJobsCompleted: jobStatsMap.get(partner._id.toString()) || 0,
        activeBidsCount: bidStatsMap.get(partner._id.toString()) || 0,
        kycDocuments: kycDocsMap.get(partner._id.toString()) || [],
      };
    });

    return {
      partners: partnersWithStats,
      total,
      page,
      limit,
    };
  }

  /**
   * Verify a customer
   */
  async verifyCustomer(id: string): Promise<any> {
    const user = await UserModel.findByIdAndUpdate(
      id,
      { isActive: true, isPhoneVerified: true, isEmailVerified: true },
      { new: true }
    );
    if (!user) {
      throw new Error('Customer not found');
    }
    return user;
  }

  /**
   * Verify a partner
   */
  async verifyPartner(id: string, status: 'APPROVED' | 'REJECTED' = 'APPROVED', reason?: string): Promise<any> {
    const updateData: any = { verificationStatus: status };
    if (status === 'APPROVED') {
      updateData.isVerified = true;
    }
    if (reason) {
      updateData.rejectionReason = reason;
    }

    const partner = await PartnerModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    if (!partner) {
      throw new Error('Partner not found');
    }
    if (status === 'APPROVED') {
      await UserModel.findByIdAndUpdate(partner.userId, { isActive: true });
      await KycDocumentModel.updateMany({ partnerId: id }, { status: 'APPROVED' });
    } else {
      await KycDocumentModel.updateMany({ partnerId: id }, { status: 'REJECTED' });
    }

    try {
      emitToUser(partner.userId.toString(), 'kyc_status_changed', { 
        status, 
        reason,
        message: `Your KYC verification has been ${status.toLowerCase()}.` 
      });
      emitToRole('EXECUTIVE', 'partner_status_updated', {
        partnerId: partner._id,
        status
      });
    } catch (err) {
      // ignore
    }

    return partner;
  }
}

export const executiveService = new ExecutiveService();
