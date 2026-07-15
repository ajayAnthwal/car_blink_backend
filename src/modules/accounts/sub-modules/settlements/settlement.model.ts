import mongoose, { Schema, Document } from 'mongoose';

export interface ISettlement extends Document {
  partnerId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  grossAmount: number;
  platformCommission: number;
  netPayoutAmount: number;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  processedByAccountsId?: mongoose.Types.ObjectId;
  processedAt?: Date;
  transactionReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
      required: [true, 'Partner ID is required'],
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job ID is required'],
      unique: true,
    },
    grossAmount: {
      type: Number,
      required: [true, 'Gross amount is required'],
    },
    platformCommission: {
      type: Number,
      required: [true, 'Platform commission is required'],
    },
    netPayoutAmount: {
      type: Number,
      required: [true, 'Net payout amount is required'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSED', 'FAILED'],
      default: 'PENDING',
      required: true,
    },
    processedByAccountsId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    processedAt: {
      type: Date,
    },
    transactionReference: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

SettlementSchema.index({ partnerId: 1, createdAt: -1 });

export const SettlementModel = mongoose.model<ISettlement>('Settlement', SettlementSchema);
export default SettlementModel;
