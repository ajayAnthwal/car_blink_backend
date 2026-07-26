import mongoose, { Schema, Document } from 'mongoose';

export interface ISettlement extends Document {
  partnerId: mongoose.Types.ObjectId;
  amount: number;
  status: 'PENDING' | 'PAID';
  transactionId?: string;
  notes?: string;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SettlementSchema = new Schema<ISettlement>(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID'],
      default: 'PENDING',
    },
    transactionId: {
      type: String,
    },
    notes: {
      type: String,
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const SettlementModel = mongoose.models.Settlement || mongoose.model<ISettlement>('Settlement', SettlementSchema);
export default SettlementModel;
