import mongoose, { Schema, Document } from 'mongoose';

export enum TRANSACTION_TYPE {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export interface ILedgerTransaction extends Document {
  walletId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId; // Optional, as some transactions might be manual recharges
  amount: number;
  type: TRANSACTION_TYPE;
  description: string;
  balanceAfter: number;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerTransactionSchema = new Schema<ILedgerTransaction>(
  {
    walletId: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: Object.values(TRANSACTION_TYPE),
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const LedgerTransactionModel = mongoose.model<ILedgerTransaction>('LedgerTransaction', LedgerTransactionSchema);
export default LedgerTransactionModel;
