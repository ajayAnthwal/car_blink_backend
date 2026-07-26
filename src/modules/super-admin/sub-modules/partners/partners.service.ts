import { PartnerModel } from '../../../partner/partner.model';
import { KycDocumentModel } from '../../../partner/sub-modules/kyc/kyc.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';

export class SuperAdminPartnersService {
  /**
   * Get all partners (garages)
   */
  async getAllPartners(query: any) {
    const { page = 1, limit = 10, verificationStatus, search } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = {};

    if (verificationStatus) {
      filter.verificationStatus = verificationStatus;
    }

    if (search) {
      filter.businessName = { $regex: search, $options: 'i' };
    }

    const partners = await PartnerModel.find(filter)
      .populate('userId', 'fullName email phone')
      .populate('cityId', 'name state')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await PartnerModel.countDocuments(filter);

    return {
      docs: partners,
      totalDocs: total,
      limit: Number(limit),
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      hasNextPage: skip + partners.length < total,
      hasPrevPage: Number(page) > 1,
    };
  }

  /**
   * Get specific partner details including KYC documents
   */
  async getPartnerDetails(partnerId: string): Promise<any> {
    const partner = await PartnerModel.findById(partnerId)
      .populate('userId', 'fullName email phone')
      .populate('cityId', 'name state')
      .populate('servicesOffered', 'name category')
      .lean();

    if (!partner) {
      throw new NotFoundError('Partner not found');
    }

    // Fetch KYC documents
    const kycDocuments = await KycDocumentModel.find({ partnerId }).lean();

    return {
      ...partner,
      kycDocuments
    };
  }

  /**
   * Approve or reject partner KYC
   */
  async updateKycStatus(partnerId: string, status: 'APPROVED' | 'REJECTED', reason?: string) {
    const partner = await PartnerModel.findById(partnerId);
    if (!partner) {
      throw new NotFoundError('Partner not found');
    }

    partner.verificationStatus = status;
    if (status === 'APPROVED') {
      partner.isVerified = true;
      partner.rejectionReason = undefined;
    } else if (status === 'REJECTED') {
      partner.isVerified = false;
      partner.rejectionReason = reason;
    }

    await partner.save();

    // Optionally update the status of the documents as well, though usually partner status is enough.
    if (status === 'APPROVED' || status === 'REJECTED') {
        await KycDocumentModel.updateMany(
            { partnerId },
            { $set: { status } }
        );
    }

    return partner;
  }
}

export const superAdminPartnersService = new SuperAdminPartnersService();
