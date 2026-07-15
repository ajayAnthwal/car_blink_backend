import mongoose, { Schema, Document } from 'mongoose';

export interface IKycDocument extends Document {
  partnerId: mongoose.Types.ObjectId;
  documentType: 'GST_CERTIFICATE' | 'SHOP_LICENSE' | 'ID_PROOF' | 'ADDRESS_PROOF';
  documentUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
}

const KycDocumentSchema = new Schema<IKycDocument>(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
      required: [true, 'Partner ID is required'],
    },
    documentType: {
      type: String,
      enum: {
        values: ['GST_CERTIFICATE', 'SHOP_LICENSE', 'ID_PROOF', 'ADDRESS_PROOF'],
        message: '{VALUE} is not a valid document type',
      },
      required: [true, 'Document type is required'],
    },
    documentUrl: {
      type: String,
      required: [true, 'Document URL is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const KycDocumentModel = mongoose.model<IKycDocument>('KycDocument', KycDocumentSchema);
export default KycDocumentModel;
