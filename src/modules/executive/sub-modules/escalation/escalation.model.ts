import mongoose, { Schema, Document } from 'mongoose';
import { ESCALATION_RAISED_BY, ESCALATION_SEVERITY, ESCALATION_STATUS } from '../../../../common/constants/status.constant';

export interface IEscalation extends Document {
  bookingId?: mongoose.Types.ObjectId;
  ticketId?: mongoose.Types.ObjectId;
  raisedBy: ESCALATION_RAISED_BY;
  relatedUserId: mongoose.Types.ObjectId;
  assignedExecutiveId?: mongoose.Types.ObjectId;
  severity: ESCALATION_SEVERITY;
  status: ESCALATION_STATUS;
  description: string;
  resolutionNotes?: string;
  slaBreachAt?: Date;
  isSlaBreached: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EscalationSchema = new Schema<IEscalation>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'SupportTicket',
    },
    raisedBy: {
      type: String,
      enum: Object.values(ESCALATION_RAISED_BY),
      required: [true, 'Raised by source is required'],
    },
    relatedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Related User ID is required'],
    },
    assignedExecutiveId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    severity: {
      type: String,
      enum: Object.values(ESCALATION_SEVERITY),
      default: ESCALATION_SEVERITY.MEDIUM,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ESCALATION_STATUS),
      default: ESCALATION_STATUS.OPEN,
      required: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },
    slaBreachAt: {
      type: Date,
    },
    isSlaBreached: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

EscalationSchema.index({ status: 1, severity: -1 });
EscalationSchema.index({ assignedExecutiveId: 1 });
EscalationSchema.index({ bookingId: 1 });
EscalationSchema.index({ ticketId: 1 });

export const EscalationModel = mongoose.model<IEscalation>('Escalation', EscalationSchema);
