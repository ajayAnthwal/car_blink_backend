import mongoose, { Schema, Document } from 'mongoose';
import { PAYMENT_STATUS, PAYMENT_TYPE, PAYMENT_PROVIDER } from '../../common/constants/status.constant';

export interface IPayment extends Document {
  bookingId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  paymentType: PAYMENT_TYPE;
  provider: PAYMENT_PROVIDER;
  providerOrderId: string;
  providerPaymentId?: string;
  status: PAYMENT_STATUS;
  failureReason?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      required: true,
    },
    paymentType: {
      type: String,
      enum: Object.values(PAYMENT_TYPE),
      required: [true, 'Payment type is required'],
    },
    provider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDER),
      default: PAYMENT_PROVIDER.RAZORPAY,
      required: true,
    },
    providerOrderId: {
      type: String,
      required: [true, 'Provider Order ID is required'],
      unique: true,
    },
    providerPaymentId: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.CREATED,
      required: true,
    },
    failureReason: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

PaymentSchema.index({ bookingId: 1 });
PaymentSchema.index({ customerId: 1 });

export const PaymentModel = mongoose.model<IPayment>('Payment', PaymentSchema);
export default PaymentModel;
