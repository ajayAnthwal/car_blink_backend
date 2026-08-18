import { PartnerModel, IPartner } from './partner.model';
import { ConflictError } from '../../common/errors/ConflictError';
import { NotFoundError } from '../../common/errors/NotFoundError';
import { ApiError } from '../../common/errors/ApiError';
import { SettlementModel } from '../accounts/sub-modules/settlements/settlement.model';

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

function autoResolvePartnerLocation(addressStr: string): [number, number] | null {
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
      verificationStatus: 'PENDING',
      rating: 0,
      totalReviews: 0,
    });

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
    // Prevent updating userId, rating, isVerified, verificationStatus via this route
    delete data.userId;
    delete data.isVerified;
    delete data.verificationStatus;
    delete data.rating;
    delete data.totalReviews;

    // Fraud Prevention: Freeze bank details if a settlement is pending
    if (data.bankDetails) {
      const existingPartner = await PartnerModel.findOne({ userId });
      if (existingPartner) {
        const pendingSettlement = await SettlementModel.findOne({ 
          partnerId: existingPartner._id, 
          status: 'PENDING' 
        });
        if (pendingSettlement) {
          throw new ApiError(400, 'Cannot update bank details while a payout settlement is pending. This is a security measure.');
        }
      }
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

    const partner = await PartnerModel.findOneAndUpdate(
      { userId },
      { $set: data },
      { new: true, runValidators: true }
    )
      .populate('cityId')
      .populate('servicesOffered');

    if (!partner) {
      throw new NotFoundError('Partner profile not found');
    }

    return partner;
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
