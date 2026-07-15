import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  bookingId: mongoose.Types.ObjectId;
  partnerId: mongoose.Types.ObjectId;
  bidId: mongoose.Types.ObjectId;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  startedAt?: Date;
  completedAt?: Date;
  invoiceUrl?: string;
  beforePhotos: string[];
  afterPhotos: string[];
  finalAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      unique: true,
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
      required: [true, 'Partner ID is required'],
    },
    bidId: {
      type: Schema.Types.ObjectId,
      ref: 'Bid',
      required: [true, 'Bid ID is required'],
    },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'],
      default: 'NOT_STARTED',
      required: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    invoiceUrl: {
      type: String,
      trim: true,
    },
    beforePhotos: {
      type: [String],
      default: [],
    },
    afterPhotos: {
      type: [String],
      default: [],
    },
    finalAmount: {
      type: Number,
      min: [0, 'Final amount cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

export const JobModel = mongoose.model<IJob>('Job', JobSchema);
export default JobModel;
