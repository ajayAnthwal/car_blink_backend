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
   * Get all service warranties for executive oversight
   */
  async getAllWarranties(query: any = {}): Promise<any> {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, parseInt(query.limit || '10', 10));
    const skip = (page - 1) * limit;

    const { WarrantyModel } = require('../customer/sub-modules/warranty/warranty.model');
    const filter: any = {};
    if (query.status) filter.status = query.status;

    const [warranties, total] = await Promise.all([
      WarrantyModel.find(filter)
        .populate({
          path: 'bookingId',
          populate: [{ path: 'vehicleId' }, { path: 'serviceId' }]
        })
        .populate('customerId', 'fullName email phone')
        .populate('partnerId', 'businessName phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WarrantyModel.countDocuments(filter),
    ]);

    return { warranties, total, page, limit };
  }

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
  async verifyPartner(id: string, status: 'APPROVED' | 'REJECTED' = 'APPROVED', reason?: string, executiveUserId?: string): Promise<any> {
    const partner = await PartnerModel.findById(id);
    if (!partner) {
      throw new Error('Partner not found');
    }

    const updateData: any = {};
    if (executiveUserId && mongoose.Types.ObjectId.isValid(executiveUserId)) {
      updateData.executiveVerifiedBy = new mongoose.Types.ObjectId(executiveUserId);
    }

    if (status === 'APPROVED') {
      // Stage 1 Clearance: Executive Approved -> Moves to UNDER_REVIEW (Pending Super Admin Stage 2 Approval)
      updateData.executiveVerificationStatus = 'APPROVED';
      updateData.verificationStatus = 'UNDER_REVIEW';
      updateData.isVerified = false; // Restricted until Super Admin Final Approval
      updateData.executiveVerifiedAt = new Date();
      updateData.rejectionReason = undefined;
    } else {
      updateData.executiveVerificationStatus = 'REJECTED';
      updateData.verificationStatus = 'REJECTED';
      updateData.isVerified = false;
      if (reason) updateData.rejectionReason = reason;
    }

    const updatedPartner = await PartnerModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    const { notificationService } = require('../notification/notification.service');
    const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../notification/notification.model');

    if (status === 'APPROVED') {
      await KycDocumentModel.updateMany({ partnerId: id }, { status: 'UNDER_REVIEW' });
      try {
        // 1. Notify Partner about Stage 1 Verification
        await notificationService.sendNotification(
          partner.userId.toString(),
          NOTIFICATION_TYPE.IN_APP,
          NOTIFICATION_CATEGORY.SYSTEM,
          'Stage 1 Verification Passed',
          `Field Executive has verified your workshop details for "${partner.businessName}". Your application has been forwarded to Super Admin for Final Approval.`,
          { partnerId: partner._id.toString(), status: 'UNDER_REVIEW', stage: 1 }
        );

        // 2. Notify Super Admin about Executive Clearance
        await notificationService.sendToRole(
          'SUPER_ADMIN',
          NOTIFICATION_TYPE.IN_APP,
          NOTIFICATION_CATEGORY.SYSTEM,
          'Executive Approved Partner (Awaiting Final Clearance)',
          `Executive has verified & recommended Partner "${partner.businessName}". Pending Super Admin Final Activation.`,
          { partnerId: partner._id.toString(), userId: partner.userId.toString() }
        );
      } catch (e) {}
    } else {
      await KycDocumentModel.updateMany({ partnerId: id }, { status: 'REJECTED' });
      try {
        await notificationService.sendNotification(
          partner.userId.toString(),
          NOTIFICATION_TYPE.IN_APP,
          NOTIFICATION_CATEGORY.SYSTEM,
          'Partner Verification Update',
          `Your workshop application was not approved during Executive review. Reason: "${reason || 'Requirements not met'}".`,
          { partnerId: partner._id.toString(), status: 'REJECTED', reason }
        );
      } catch (e) {}
    }

    try {
      const payload = { 
        partnerId: partner._id, 
        userId: partner.userId,
        status: updatedPartner?.verificationStatus || status, 
        executiveVerificationStatus: updatedPartner?.executiveVerificationStatus || status,
        isVerified: false,
        reason,
        message: status === 'APPROVED' 
          ? 'Executive verified your profile. Pending Super Admin Final Approval.'
          : `Your verification has been ${status.toLowerCase()}.` 
      };

      emitToUser(partner.userId.toString(), 'partner_status_updated', payload);
      emitToUser(partner.userId.toString(), 'kyc_status_changed', payload);
      emitToRole('EXECUTIVE', 'partner_status_updated', payload);
      emitToRole('SUPER_ADMIN', 'partner_status_updated', payload);
    } catch (err) {
      // ignore
    }

    return updatedPartner;
  }
}

export const executiveService = new ExecutiveService();
