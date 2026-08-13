import mongoose, { Schema, Document } from 'mongoose';

export enum WITHDRAWAL_STATUS {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface IWithdrawalRequest extends Document {
  partnerId: mongoose.Types.ObjectId;
  amount: number;
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
  };
  status: WITHDRAWAL_STATUS;
  referenceId?: string; // from payment gateway
  failureReason?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalRequestSchema = new Schema<IWithdrawalRequest>(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 100, // minimum withdrawal amount
    },
    bankDetails: {
      accountNumber: { type: String, required: true },
      ifscCode: { type: String, required: true },
      accountHolderName: { type: String, required: true },
    },
    status: {
      type: String,
      enum: Object.values(WITHDRAWAL_STATUS),
      default: WITHDRAWAL_STATUS.PENDING,
    },
    referenceId: {
      type: String,
    },
    failureReason: {
      type: String,
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const WithdrawalRequestModel = mongoose.model<IWithdrawalRequest>('WithdrawalRequest', WithdrawalRequestSchema);
export default WithdrawalRequestModel;
