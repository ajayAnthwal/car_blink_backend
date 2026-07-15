import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  bookingId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  partnerId: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      unique: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job ID is required'],
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
      required: [true, 'Partner ID is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      maxlength: [500, 'Comment cannot exceed 500 characters'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

ReviewSchema.index({ partnerId: 1, createdAt: -1 });
ReviewSchema.index({ customerId: 1, createdAt: -1 });

export const ReviewModel = mongoose.model<IReview>('Review', ReviewSchema);
export default ReviewModel;
