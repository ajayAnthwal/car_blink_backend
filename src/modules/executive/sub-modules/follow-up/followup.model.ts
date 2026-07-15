import mongoose, { Schema, Document } from 'mongoose';
import { FOLLOWUP_OUTCOME, FOLLOWUP_RELATED_TO } from '../../../../common/constants/status.constant';

export interface IFollowUp extends Document {
  executiveId: mongoose.Types.ObjectId;
  relatedTo: FOLLOWUP_RELATED_TO;
  relatedUserId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  callOutcome: FOLLOWUP_OUTCOME;
  notes: string;
  followUpDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FollowUpSchema = new Schema<IFollowUp>(
  {
    executiveId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Executive ID is required'],
    },
    relatedTo: {
      type: String,
      enum: Object.values(FOLLOWUP_RELATED_TO),
      required: [true, 'Related target type is required'],
    },
    relatedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Related User ID is required'],
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    callOutcome: {
      type: String,
      enum: Object.values(FOLLOWUP_OUTCOME),
      required: [true, 'Call outcome is required'],
    },
    notes: {
      type: String,
      required: [true, 'Notes are required'],
      trim: true,
    },
    followUpDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

FollowUpSchema.index({ executiveId: 1, followUpDate: -1 });
FollowUpSchema.index({ relatedUserId: 1 });
FollowUpSchema.index({ bookingId: 1 });

export const FollowUpModel = mongoose.model<IFollowUp>('FollowUp', FollowUpSchema);
