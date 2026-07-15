import { PartnerModel, IPartner } from './partner.model';
import { ConflictError } from '../../common/errors/ConflictError';
import { NotFoundError } from '../../common/errors/NotFoundError';

export class PartnerService {
  public static async createPartnerProfile(
    userId: string,
    data: Partial<IPartner>
  ): Promise<IPartner> {
    const existing = await PartnerModel.findOne({ userId });
    if (existing) {
      throw new ConflictError('Partner profile already exists');
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
    data: Partial<IPartner>
  ): Promise<IPartner> {
    // Prevent updating userId, rating, isVerified, verificationStatus via this route
    delete data.userId;
    delete data.isVerified;
    delete data.verificationStatus;
    delete data.rating;
    delete data.totalReviews;

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
}
export default PartnerService;
