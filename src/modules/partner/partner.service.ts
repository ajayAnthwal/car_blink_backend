import { PartnerModel, IPartner } from './partner.model';
import { ConflictError } from '../../common/errors/ConflictError';
import { NotFoundError } from '../../common/errors/NotFoundError';

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
        coordinates: [data.longitude, data.latitude]
      };
      delete data.latitude;
      delete data.longitude;
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

    if (data.latitude !== undefined && data.longitude !== undefined) {
      data.location = {
        type: 'Point',
        coordinates: [data.longitude, data.latitude]
      };
      delete data.latitude;
      delete data.longitude;
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
