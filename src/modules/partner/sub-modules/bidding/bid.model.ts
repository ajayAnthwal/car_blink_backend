import mongoose, { Schema, Document } from 'mongoose';

export interface IBid extends Document {
  bookingId: mongoose.Types.ObjectId;
  partnerId: mongoose.Types.ObjectId;
  quotedAmount: number;
  estimatedDuration?: string;
  notes?: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';
  createdAt: Date;
  updatedAt: Date;
}

const BidSchema = new Schema<IBid>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
      required: [true, 'Partner ID is required'],
    },
    quotedAmount: {
      type: Number,
      required: [true, 'Quoted amount is required'],
      min: [0, 'Quoted amount cannot be negative'],
    },
    estimatedDuration: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'],
      default: 'PENDING',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate bids
BidSchema.index({ bookingId: 1, partnerId: 1 }, { unique: true });

export const BidModel = mongoose.model<IBid>('Bid', BidSchema);
export default BidModel;
