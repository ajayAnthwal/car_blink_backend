import { BannerAdModel, IBannerAd } from './banner-ad.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';

export class BannerAdService {
  async createAd(data: Partial<IBannerAd>, userId?: string) {
    const newAd = await BannerAdModel.create({
      ...data,
      createdBy: userId,
    });
    return newAd;
  }

  async getAllAds(query: any = {}) {
    const { page = 1, limit = 20, placement, isActive } = query;
    const filter: any = {};

    if (placement) {
      filter.placement = placement;
    }
    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true' || isActive === true;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [docs, total] = await Promise.all([
      BannerAdModel.find(filter)
        .sort({ priorityOrder: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      BannerAdModel.countDocuments(filter),
    ]);

    return {
      docs,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  async getActiveAds(placement?: string) {
    const filter: any = { isActive: true };
    if (placement) {
      filter.placement = placement;
    }
    return BannerAdModel.find(filter)
      .sort({ priorityOrder: -1, createdAt: -1 })
      .lean();
  }

  async updateAd(id: string, data: Partial<IBannerAd>) {
    const ad = await BannerAdModel.findByIdAndUpdate(id, data, { new: true });
    if (!ad) {
      throw new NotFoundError('Banner Ad not found');
    }
    return ad;
  }

  async deleteAd(id: string) {
    const ad = await BannerAdModel.findByIdAndDelete(id);
    if (!ad) {
      throw new NotFoundError('Banner Ad not found');
    }
    return { message: 'Banner Ad deleted successfully' };
  }
}

export const bannerAdService = new BannerAdService();
export default bannerAdService;
