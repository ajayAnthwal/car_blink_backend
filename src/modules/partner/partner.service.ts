import { PartnerModel, IPartner } from './partner.model';
import { ConflictError } from '../../common/errors/ConflictError';
import { NotFoundError } from '../../common/errors/NotFoundError';
import { ApiError } from '../../common/errors/ApiError';
import { SettlementModel } from '../accounts/sub-modules/settlements/settlement.model';
import { PartnerAntiFakeService } from './partner-anti-fake.service';

const DEFAULT_LOCATION_COORDINATES_MAP: Record<string, [number, number]> = {
  "rispna": [78.0556, 30.2931],
  "isbt": [78.0322, 30.3165],
  "clock tower": [78.0422, 30.3256],
  "rajpur": [78.0612, 30.3421],
  "ballupur": [78.0089, 30.3341],
  "subhash nagar": [77.9944, 30.2711],
  "prem nagar": [77.9622, 30.3321],
  "patel nagar": [78.0211, 30.3089],
  "dehradun": [78.0322, 30.3165],
  "bhuddi": [77.9800, 30.2600],
  "agar": [76.0167, 23.7167],
};

export function autoResolvePartnerLocation(addressStr: string): [number, number] | null {
  if (!addressStr) return null;
  const lower = addressStr.toLowerCase();
  for (const [key, coords] of Object.entries(DEFAULT_LOCATION_COORDINATES_MAP)) {
    if (lower.includes(key)) {
      return coords;
    }
  }
  return null;
}

export class PartnerService {
  public static async createPartnerProfile(
    userId: string,
    data: any
  ): Promise<IPartner> {
    const existing = await PartnerModel.findOne({ userId });
    if (existing) {
      throw new ConflictError('Partner profile already exists');
    }

    if (data.latitude !== undefined && data.longitude !== undefined) {
      data.location = {
        type: 'Point',
        coordinates: [Number(data.longitude), Number(data.latitude)]
      };
      delete data.latitude;
      delete data.longitude;
    } else if (!data.location && data.businessAddress) {
      const autoCoords = autoResolvePartnerLocation(data.businessAddress);
      if (autoCoords) {
        data.location = {
          type: 'Point',
          coordinates: autoCoords
        };
      }
    }

    const partner = await PartnerModel.create({
      ...data,
      userId,
      isVerified: false,
      executiveVerificationStatus: 'PENDING',
      verificationStatus: 'PENDING',
      rating: 0,
      totalReviews: 0,
    });

    try {
      const { notificationService } = require('../notification/notification.service');
      const { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } = require('../notification/notification.model');
      const { emitToRole } = require('../../sockets');

      await notificationService.sendToRole(
        'EXECUTIVE',
        NOTIFICATION_TYPE.IN_APP,
        NOTIFICATION_CATEGORY.SYSTEM,
        'New Partner Registered',
        `New Workshop Partner "${partner.businessName || 'Workshop'}" (${partner.ownerName || 'Partner'}) has registered. Verification Pending.`,
        { partnerId: partner._id.toString(), userId: String(userId) }
      );

      await notificationService.sendToRole(
        'SUPER_ADMIN',
        NOTIFICATION_TYPE.IN_APP,
        NOTIFICATION_CATEGORY.SYSTEM,
        'New Partner Registered',
        `New Workshop Partner "${partner.businessName || 'Workshop'}" (${partner.ownerName || 'Partner'}) has registered. Verification Pending.`,
        { partnerId: partner._id.toString(), userId: String(userId) }
      );

      emitToRole('EXECUTIVE', 'partner_registered', { partner });
      emitToRole('SUPER_ADMIN', 'partner_registered', { partner });
      emitToRole('EXECUTIVE', 'partner_status_updated', { partnerId: partner._id, status: 'PENDING', executiveVerificationStatus: 'PENDING' });
      emitToRole('SUPER_ADMIN', 'partner_status_updated', { partnerId: partner._id, status: 'PENDING', executiveVerificationStatus: 'PENDING' });
    } catch (e) {}

    return partner;
  }

  public static async getMyPartnerProfile(userId: string): Promise<IPartner> {
    const partner = await PartnerModel.findOne({ userId })
      .populate('cityId')
      .populate('servicesOffered');

    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    return partner;
  }

  public static async updatePartnerProfile(
    userId: string,
    data: any
  ): Promise<IPartner> {
    const existingPartner = await PartnerModel.findOne({ userId });
    if (!existingPartner) {
      throw new NotFoundError('Partner profile not found');
    }

    // Prevent direct tampering of critical lifecycle fields via plain profile patch
    delete data.userId;
    delete data.isVerified;
    delete data.verificationStatus;
    delete data.rating;
    delete data.totalReviews;

    // Fraud Prevention: Only validate & freeze bank details if partner is ACTUALLY changing their bank details
    const incomingAcc = (data.accountNumber || data.bankDetails?.accountNumber || '').trim();
    const incomingIfsc = (data.ifsc || data.bankDetails?.ifscCode || '').trim().toUpperCase();
    const incomingHolder = (data.accountHolderName || data.bankDetails?.accountHolderName || '').trim();

    const currentAcc = (existingPartner.accountNumber || existingPartner.bankDetails?.accountNumber || '').trim();
    const currentIfsc = (existingPartner.ifsc || existingPartner.bankDetails?.ifscCode || '').trim().toUpperCase();
    const currentHolder = (existingPartner.accountHolderName || existingPartner.bankDetails?.accountHolderName || '').trim();

    // Check if the user is actually modifying their bank details to a new, unmasked value
    const isRealBankUpdate =
      incomingAcc.length > 0 &&
      !incomingAcc.includes('•') &&
      (
        incomingAcc !== currentAcc ||
        (incomingIfsc.length > 0 && incomingIfsc !== currentIfsc) ||
        (incomingHolder.length > 0 && incomingHolder !== currentHolder)
      );

    if (isRealBankUpdate) {
      const pendingSettlement = await SettlementModel.findOne({ 
        partnerId: existingPartner._id, 
        status: 'PENDING' 
      });
      if (pendingSettlement) {
        throw new ApiError(400, 'Cannot update bank details while a payout settlement is pending. This is a security measure.');
      }

      existingPartner.accountNumber = incomingAcc;
      if (incomingIfsc) existingPartner.ifsc = incomingIfsc;
      if (incomingHolder) existingPartner.accountHolderName = incomingHolder;
      existingPartner.bankVerificationStatus = 'PENDING';

      existingPartner.bankDetails = {
        accountNumber: incomingAcc,
        ifscCode: incomingIfsc,
        accountHolderName: incomingHolder,
      };
    }

    delete data.bankDetails;
    delete data.accountNumber;
    delete data.ifsc;
    delete data.accountHolderName;

    // Handle Custom Services
    if (data.customServices !== undefined) {
      if (Array.isArray(data.customServices)) {
        existingPartner.customServices = Array.from(
          new Set(
            data.customServices
              .map((s: any) => String(s).trim())
              .filter((s: string) => s.length > 0)
          )
        );
      }
      delete data.customServices;
    }

    if (data.latitude !== undefined && data.longitude !== undefined) {
      data.location = {
        type: 'Point',
        coordinates: [Number(data.longitude), Number(data.latitude)]
      };
      delete data.latitude;
      delete data.longitude;
    } else if (!data.location && data.businessAddress) {
      const autoCoords = autoResolvePartnerLocation(data.businessAddress);
      if (autoCoords) {
        data.location = {
          type: 'Point',
          coordinates: autoCoords
        };
      }
    }

    // Task 8: Check if partner was already approved and is changing critical fields
    // (PAN, GSTIN, bank details, workshop address, map pin, owner name)
    // If so, moves status to UNDER_REVIEW, flags reVerificationRequired, and logs audit trail.
    await PartnerAntiFakeService.processReVerificationCheck(existingPartner, data);

    // Apply allowed updates to partner document
    Object.assign(existingPartner, data);

    // Task 8: Run duplicate detection across mobile, PAN, GSTIN, bank, location proximity, name
    const duplicateFlags = await PartnerAntiFakeService.runDuplicateDetection(
      existingPartner._id,
      {
        mobile: existingPartner.mobile,
        pan: existingPartner.pan,
        gstin: existingPartner.gstin,
        udyamNumber: existingPartner.udyamNumber,
        accountNumber: existingPartner.accountNumber || existingPartner.bankDetails?.accountNumber,
        location: existingPartner.location,
        workshopName: existingPartner.workshopName || existingPartner.businessName,
        businessAddress: existingPartner.businessAddress,
      }
    );
    existingPartner.duplicateFlags = duplicateFlags;

    await existingPartner.save();

    const populated = await PartnerModel.findById(existingPartner._id)
      .populate('cityId')
      .populate('servicesOffered');

    return populated || existingPartner;
  }
  public static async updateCapacity(
    userId: string,
    data: { dailyCapacity?: number; blockedDates?: string[] }
  ): Promise<IPartner> {
    const updateData: any = {};
    if (data.dailyCapacity !== undefined) updateData.dailyCapacity = data.dailyCapacity;
    if (data.blockedDates !== undefined) {
      updateData.blockedDates = data.blockedDates.map(d => new Date(d));
    }

    const partner = await PartnerModel.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true }
    );
    if (!partner) throw new NotFoundError('Partner profile not found');
    return partner;
  }

  public static async getTopWorkshops(): Promise<IPartner[]> {
    // Fetch top 4 verified workshops, sorted by rating
    return await PartnerModel.find({ isVerified: true })
      .populate('cityId', 'name')
      .sort({ rating: -1, totalReviews: -1 })
      .limit(4);
  }
}
export default PartnerService;
