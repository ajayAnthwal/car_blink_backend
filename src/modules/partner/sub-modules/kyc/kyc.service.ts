import { KycDocumentModel, IKycDocument } from './kyc.model';
import { PartnerModel } from '../../partner.model';
import { NotFoundError } from '../../../../common/errors/NotFoundError';
import { emitToRole } from '../../../../sockets';

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

    if (partner.verificationStatus === 'PENDING' || partner.verificationStatus === 'REJECTED') {
      partner.verificationStatus = 'UNDER_REVIEW';
      await partner.save();
      
      try {
        emitToRole('EXECUTIVE', 'kyc_update', {
          partnerId: partner._id,
          message: 'New KYC document uploaded by partner'
        });
      } catch (err) {
        // ignore socket errors
      }
    }

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
