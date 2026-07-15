import { KycDocumentModel, IKycDocument } from './kyc.model';
import { PartnerModel } from '../../partner.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';

export class KycService {
  public static async uploadKycDocument(
    userId: string,
    data: { documentType: string; documentUrl: string }
  ): Promise<IKycDocument> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found. Please create a profile first.');
    }

    const doc = await KycDocumentModel.create({
      partnerId: partner._id,
      documentType: data.documentType,
      documentUrl: data.documentUrl,
      status: 'PENDING',
    });

    return doc;
  }

  public static async getMyKycDocuments(userId: string): Promise<IKycDocument[]> {
    const partner = await PartnerModel.findOne({ userId });
    if (!partner) {
      throw new NotFoundError('Partner profile not found.');
    }

    return KycDocumentModel.find({ partnerId: partner._id });
  }
}
export default KycService;
