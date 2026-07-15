import mongoose, { Schema, Document } from 'mongoose';
import { ASSIGNMENT_TYPE } from '../../../../common/constants/status.constant';

export interface IAssignment extends Document {
  bookingId: mongoose.Types.ObjectId;
  assignedExecutiveId: mongoose.Types.ObjectId;
  assignedPartnerId?: mongoose.Types.ObjectId;
  assignmentType: ASSIGNMENT_TYPE;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
      unique: true,
    },
    assignedExecutiveId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned Executive ID is required'],
    },
    assignedPartnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
    },
    assignmentType: {
      type: String,
      enum: Object.values(ASSIGNMENT_TYPE),
      default: ASSIGNMENT_TYPE.AUTO_MATCHED,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

AssignmentSchema.index({ assignedExecutiveId: 1 });
AssignmentSchema.index({ assignedPartnerId: 1 });

export const AssignmentModel = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
