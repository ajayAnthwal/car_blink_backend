import mongoose from 'mongoose';
import { PartnerModel, IPartner } from './partner.model';
import { BookingModel, IBooking } from '../customer/sub-modules/booking/booking.model';
import { BidModel } from './sub-modules/bidding/bid.model';
import { JobModel } from './sub-modules/jobs/job.model';
import { ServiceModel, IService } from '../master-data/models/service.model';
import { BadRequestError } from '../../common/errors/BadRequestError';
import { NotFoundError } from '../../common/errors/NotFoundError';

export interface IEligiblePartnerComparison {
  partnerId: string;
  uniquePartnerId?: string;
  businessName: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  businessAddress?: string;
  location?: {
    type: string;
    coordinates: number[];
  };
  distanceKm: number | null;
  verificationStatus: string;
  isActive: boolean;
  isEligible: boolean;
  ineligibilityReasons: string[];
  serviceOfferedMatched: boolean;
  matchedServices: string[];
  availability: {
    isAvailable: boolean;
    isDateBlocked: boolean;
    isAtCapacity: boolean;
    maxCapacity: number;
    activeJobsCount: number;
    availableBays: number;
  };
  quote: {
    bidId: string;
    quotedAmount: number;
    estimatedDuration?: string;
    notes?: string;
    status: string;
  } | null;
  performance: {
    rating: number;
    totalReviews: number;
    totalJobsCompleted: number;
  };
  capabilities: {
    serviceBays: number;
    technicianCount: number;
    pickupDropAvailable: boolean;
    insuranceWorkCapable: boolean;
    workingDays?: string[];
  };
}

export class PartnerEligibilityService {
  /**
   * Calculate spherical Haversine distance in kilometers between two [lng, lat] coordinates
   */
  public static calculateDistanceKm(
    coord1: [number, number] | number[] | undefined,
    coord2: [number, number] | number[] | undefined
  ): number | null {
    if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) {
      return null;
    }

    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;

    if (isNaN(lon1) || isNaN(lat1) || isNaN(lon2) || isNaN(lat2)) {
      return null;
    }

    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Determine whether a partner offers the service requested in a booking
   */
  public static matchServiceCapability(
    partner: IPartner,
    service: IService | null
  ): { matched: boolean; matchedServices: string[] } {
    if (!service) {
      return { matched: true, matchedServices: ['Default'] };
    }

    const matchedServices: string[] = [];
    const serviceIdStr = service._id ? service._id.toString() : '';

    // 1. Check direct ObjectId match in partner.servicesOffered
    if (partner.servicesOffered && Array.isArray(partner.servicesOffered)) {
      const hasIdMatch = partner.servicesOffered.some((id: any) => id?.toString() === serviceIdStr);
      if (hasIdMatch) {
        matchedServices.push(service.name || 'Offered Service');
      }
    }

    // 2. Check capability categories in partner.services
    if (partner.services && Array.isArray(partner.services)) {
      const sName = (service.name || '').toLowerCase();
      const sCategory = (service.category || '').toLowerCase();
      const sSlug = (service.slug || '').toLowerCase();

      for (const capability of partner.services) {
        const capLower = capability.toLowerCase();

        // Exact category or capability match
        if (
          capLower === sCategory ||
          capLower === sName ||
          sName.includes(capLower) ||
          capLower.includes(sName) ||
          sCategory.includes(capLower) ||
          sSlug.includes(capLower)
        ) {
          if (!matchedServices.includes(capability)) {
            matchedServices.push(capability);
          }
        }
      }
    }

    return {
      matched: matchedServices.length > 0,
      matchedServices,
    };
  }

  /**
   * Evaluate complete eligibility for a partner against a specific booking
   */
  public static async evaluatePartnerForBooking(
    partner: IPartner,
    booking: IBooking,
    serviceDoc: IService | null,
    customerCoords?: [number, number]
  ): Promise<IEligiblePartnerComparison> {
    const ineligibilityReasons: string[] = [];

    // Rule 1: verificationStatus == APPROVED_VERIFIED
    const isStatusApproved =
      partner.verificationStatus === 'APPROVED_VERIFIED' ||
      (partner.verificationStatus === 'APPROVED' && partner.isVerified);

    if (!isStatusApproved) {
      ineligibilityReasons.push(
        `Partner verification status is '${partner.verificationStatus}'. Must be APPROVED_VERIFIED.`
      );
    }

    // Rule 2: isActive == true
    if (partner.isActive === false) {
      ineligibilityReasons.push('Partner account is currently deactivated (isActive is false).');
    }

    // Check specific disallowed states
    if (partner.verificationStatus === 'SUSPENDED') {
      ineligibilityReasons.push('Partner is suspended.');
    } else if (partner.verificationStatus === 'REJECTED') {
      ineligibilityReasons.push('Partner verification was rejected.');
    } else if (partner.verificationStatus === 'MANUAL_VERIFICATION_REQUIRED') {
      ineligibilityReasons.push('Partner requires manual verification by admin.');
    } else if (
      partner.verificationStatus === 'PENDING' ||
      partner.verificationStatus === 'UNDER_REVIEW' ||
      partner.verificationStatus === 'DOCUMENTS_PENDING' ||
      partner.verificationStatus === 'REGISTRATION_SUBMITTED'
    ) {
      ineligibilityReasons.push('Partner verification is still pending review.');
    }

    // Rule 3: Must offer the service requested
    const serviceMatch = this.matchServiceCapability(partner, serviceDoc);
    if (!serviceMatch.matched) {
      const serviceName = serviceDoc ? serviceDoc.name : 'requested service';
      ineligibilityReasons.push(`Partner does not offer the requested service (${serviceName}).`);
    }

    // Rule 4: Availability & Blocked Dates
    const checkDate = new Date(booking.preferredDate || new Date());
    checkDate.setHours(0, 0, 0, 0);

    const isDateBlocked = (partner.blockedDates || []).some((bd: Date) => {
      const d = new Date(bd);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === checkDate.getTime();
    });

    if (isDateBlocked) {
      ineligibilityReasons.push(`Partner is blocked for the booking date: ${checkDate.toDateString()}`);
    }

    // Rule 5: Daily Capacity
    const startOfDay = new Date(checkDate);
    const endOfDay = new Date(checkDate);
    endOfDay.setHours(23, 59, 59, 999);

    const activeJobsCount = await JobModel.countDocuments({
      partnerId: partner._id,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['NOT_STARTED', 'IN_PROGRESS'] },
    });

    const maxCapacity = partner.dailyCapacity || partner.serviceBays || 5;
    const isAtCapacity = activeJobsCount >= maxCapacity;
    const availableBays = Math.max(0, maxCapacity - activeJobsCount);

    if (isAtCapacity) {
      ineligibilityReasons.push(
        `Partner reached maximum daily capacity (${activeJobsCount}/${maxCapacity} active jobs on this date).`
      );
    }

    // Calculate Distance
    const bookingCoords =
      booking.location?.coordinates && booking.location.coordinates.length === 2
        ? (booking.location.coordinates as [number, number])
        : customerCoords;

    const partnerCoords =
      partner.location?.coordinates && partner.location.coordinates.length === 2
        ? (partner.location.coordinates as [number, number])
        : undefined;

    const distanceKm = this.calculateDistanceKm(bookingCoords, partnerCoords);

    // Existing Quote / Bid by partner
    const existingBid: any = await BidModel.findOne({
      bookingId: booking._id,
      partnerId: partner._id,
    })
      .select('quotedAmount estimatedDuration notes status')
      .lean();

    const quote = existingBid
      ? {
          bidId: existingBid._id.toString(),
          quotedAmount: existingBid.quotedAmount,
          estimatedDuration: existingBid.estimatedDuration,
          notes: existingBid.notes,
          status: existingBid.status,
        }
      : null;

    const isEligible = ineligibilityReasons.length === 0;

    return {
      partnerId: partner._id.toString(),
      uniquePartnerId: partner.uniquePartnerId,
      businessName: partner.businessName,
      ownerName: partner.ownerName,
      phone: (partner as any).phone,
      email: (partner as any).email,
      businessAddress: partner.businessAddress || partner.addressLine,
      location: partner.location,
      distanceKm,
      verificationStatus: partner.verificationStatus,
      isActive: partner.isActive !== false,
      isEligible,
      ineligibilityReasons,
      serviceOfferedMatched: serviceMatch.matched,
      matchedServices: serviceMatch.matchedServices,
      availability: {
        isAvailable: !isDateBlocked && !isAtCapacity,
        isDateBlocked,
        isAtCapacity,
        maxCapacity,
        activeJobsCount,
        availableBays,
      },
      quote,
      performance: {
        rating: partner.rating || 0,
        totalReviews: partner.totalReviews || 0,
        totalJobsCompleted: (partner as any).totalJobsCompleted || 0,
      },
      capabilities: {
        serviceBays: partner.serviceBays || 0,
        technicianCount: partner.technicianCount || 0,
        pickupDropAvailable: Boolean(partner.pickupDropAvailable),
        insuranceWorkCapable: Boolean(partner.insuranceWorkCapable),
        workingDays: partner.workingDays,
      },
    };
  }

  /**
   * Get all eligible partners for a booking with full comparison metrics (distance, quote, availability, performance)
   */
  public static async getEligiblePartnersForBooking(
    bookingId: string,
    options: { includeAll?: boolean; cityId?: string; maxRadiusKm?: number } = {}
  ): Promise<{
    booking: {
      _id: string;
      status: string;
      preferredDate?: Date;
      service: { _id: string; name: string; category?: string };
      city?: { _id: string; name: string };
      location?: any;
      assignedPartnerId?: string;
    };
    eligibleCount: number;
    totalPartners: number;
    partners: IEligiblePartnerComparison[];
  }> {
    const booking = await BookingModel.findById(bookingId)
      .populate('serviceId', 'name category slug price')
      .populate('cityId', 'name state')
      .populate('customerId', 'fullName email phone location')
      .lean();

    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const serviceDoc = booking.serviceId as unknown as IService;
    const customerCoords = (booking.customerId as any)?.location?.coordinates;

    // Search filter for partners
    const partnerQuery: any = {};
    if (!options.includeAll) {
      // By default: Include ONLY partners where verificationStatus == APPROVED_VERIFIED AND isActive == true
      partnerQuery.verificationStatus = { $in: ['APPROVED_VERIFIED', 'APPROVED'] };
      partnerQuery.isActive = { $ne: false };
    }

    const cityDoc = booking.cityId as any;
    if (options.cityId && options.cityId !== 'all') {
      const cIdStr = options.cityId.toString();
      partnerQuery.$or = [
        { cityId: mongoose.Types.ObjectId.isValid(cIdStr) ? new mongoose.Types.ObjectId(cIdStr) : cIdStr },
        { cityId: cIdStr },
        ...(cityDoc?.name ? [{ city: cityDoc.name }] : []),
      ];
    }

    const allPartners = await PartnerModel.find(partnerQuery).lean();

    const comparisons: IEligiblePartnerComparison[] = [];
    for (const partner of allPartners) {
      const evaluation = await this.evaluatePartnerForBooking(
        partner as unknown as IPartner,
        booking as unknown as IBooking,
        serviceDoc,
        customerCoords
      );

      // If strict mode (default), filter out ineligible partners unless includeAll is true
      if (options.includeAll || evaluation.isEligible) {
        // Radius filter if specified
        if (
          options.maxRadiusKm &&
          evaluation.distanceKm !== null &&
          evaluation.distanceKm > options.maxRadiusKm
        ) {
          continue;
        }
        comparisons.push(evaluation);
      }
    }

    // Sort order:
    // 1. Eligible first (if includeAll is true)
    // 2. Already submitted quote first
    // 3. Closest distance first (if distance available)
    // 4. Highest rating first
    comparisons.sort((a, b) => {
      if (a.isEligible !== b.isEligible) {
        return a.isEligible ? -1 : 1;
      }
      if (Boolean(a.quote) !== Boolean(b.quote)) {
        return a.quote ? -1 : 1;
      }
      if (a.distanceKm !== null && b.distanceKm !== null) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm !== null) return -1;
      if (b.distanceKm !== null) return 1;
      return (b.performance?.rating || 0) - (a.performance?.rating || 0);
    });

    const eligibleCount = comparisons.filter((c) => c.isEligible).length;

    return {
      booking: {
        _id: booking._id.toString(),
        status: booking.status,
        preferredDate: booking.preferredDate,
        service: {
          _id: serviceDoc?._id ? serviceDoc._id.toString() : '',
          name: serviceDoc?.name || 'Service',
          category: serviceDoc?.category,
        },
        city: {
          _id: cityDoc?._id ? cityDoc._id.toString() : '',
          name: cityDoc?.name || '',
        },
        location: booking.location,
        assignedPartnerId: booking.assignedPartnerId?.toString(),
      },
      eligibleCount,
      totalPartners: comparisons.length,
      partners: comparisons,
    };
  }

  /**
   * Validate that a partner is strictly eligible to be assigned to a booking.
   * Throws clear BadRequestError if ineligible.
   */
  public static async validatePartnerAssignment(
    bookingId: string,
    partnerId: string
  ): Promise<{ partner: IPartner; booking: IBooking }> {
    const booking = await BookingModel.findById(bookingId).populate('serviceId');
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const partner = await PartnerModel.findById(partnerId);
    if (!partner) {
      throw new NotFoundError(`Partner with ID '${partnerId}' not found`);
    }

    const evaluation = await this.evaluatePartnerForBooking(
      partner,
      booking,
      booking.serviceId as unknown as IService
    );

    if (!evaluation.isEligible) {
      const reasonList = evaluation.ineligibilityReasons.join('; ');
      throw new BadRequestError(
        `Cannot assign partner "${partner.businessName}" (${partner.uniquePartnerId || partner._id}): ${reasonList}`
      );
    }

    return { partner, booking };
  }
}
