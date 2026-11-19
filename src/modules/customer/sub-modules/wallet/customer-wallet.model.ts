import mongoose, { Schema, Document } from 'mongoose';

export enum WALLET_TRANSACTION_TYPE {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export interface ICustomerWallet extends Document {
  customerId: mongoose.Types.ObjectId;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomerWalletTransaction extends Document {
  walletId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  type: WALLET_TRANSACTION_TYPE;
  amount: number;
  note: string;
  createdBy: mongoose.Types.ObjectId;
  createdByRole: string;
  balanceAfter: number;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerWalletSchema = new Schema<ICustomerWallet>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'customer_wallets',
  }
);

const CustomerWalletTransactionSchema = new Schema<ICustomerWalletTransaction>(
  {
    walletId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomerWallet',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(WALLET_TRANSACTION_TYPE),
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    note: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByRole: {
      type: String,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'customer_wallet_transactions',
  }
);

CustomerWalletTransactionSchema.index({ customerId: 1, createdAt: -1 });

export const CustomerWalletModel = mongoose.model<ICustomerWallet>(
  'CustomerWallet',
  CustomerWalletSchema
);

export const CustomerWalletTransactionModel = mongoose.model<ICustomerWalletTransaction>(
  'CustomerWalletTransaction',
  CustomerWalletTransactionSchema
);
