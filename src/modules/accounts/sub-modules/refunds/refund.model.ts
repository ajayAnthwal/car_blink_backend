import mongoose, { Schema, Document } from 'mongoose';

export interface IRefund extends Document {
  paymentId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  amount: number;
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'PROCESSED' | 'REJECTED';
  processedByAccountsId?: mongoose.Types.ObjectId;
  providerRefundId?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema = new Schema<IRefund>(
  {
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment ID is required'],
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: [true, 'Refund amount is required'],
      min: [0, 'Refund amount must be positive'],
    },
    reason: {
      type: String,
      required: [true, 'Refund reason is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['REQUESTED', 'APPROVED', 'PROCESSED', 'REJECTED'],
      default: 'REQUESTED',
      required: true,
    },
    processedByAccountsId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    providerRefundId: {
      type: String,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

RefundSchema.index({ paymentId: 1 });
RefundSchema.index({ bookingId: 1 });
RefundSchema.index({ customerId: 1 });

export const RefundModel = mongoose.model<IRefund>('Refund', RefundSchema);
export default RefundModel;
