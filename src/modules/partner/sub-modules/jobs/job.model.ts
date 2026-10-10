import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  bookingId: mongoose.Types.ObjectId;
  partnerId: mongoose.Types.ObjectId;
  bidId: mongoose.Types.ObjectId;
  status: 'NOT_STARTED' | 'VERIFIED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startedAt?: Date;
  completedAt?: Date;
  invoiceUrl?: string;
  beforePhotos: string[];
  afterPhotos: string[];
  jobExtensions: {
    _id?: mongoose.Types.ObjectId;
    partName: string;
    cost: number;
    description?: string;
    reason?: string;
    executiveNote?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PENDING_EXECUTIVE_REVIEW' | 'EXECUTIVE_APPROVED' | 'EXECUTIVE_REJECTED' | 'CLARIFICATION_REQUESTED';
  }[];
  staffId?: mongoose.Types.ObjectId;
  finalAmount?: number;
  suspendedPartnerFlag?: boolean;
  partnerSuspendedAt?: Date;
  adminWorkflowFlag?: string;
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
      enum: ['NOT_STARTED', 'VERIFIED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
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
    jobExtensions: [
      {
        partName: { type: String, required: true },
        cost: { type: Number, required: true },
        description: { type: String, trim: true },
        reason: { type: String, trim: true },
        executiveNote: { type: String, trim: true },
        status: {
          type: String,
          enum: [
            'PENDING',
            'APPROVED',
            'REJECTED',
            'PENDING_EXECUTIVE_REVIEW',
            'EXECUTIVE_APPROVED',
            'EXECUTIVE_REJECTED',
            'CLARIFICATION_REQUESTED',
          ],
          default: 'PENDING_EXECUTIVE_REVIEW',
        },
      },
    ],
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      default: null
    },
    finalAmount: {
      type: Number,
      min: [0, 'Final amount cannot be negative'],
    },
    suspendedPartnerFlag: {
      type: Boolean,
      default: false,
    },
    partnerSuspendedAt: {
      type: Date,
    },
    adminWorkflowFlag: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const JobModel = mongoose.model<IJob>('Job', JobSchema);

export interface IJobExtensionLog extends Document {
  jobId: mongoose.Types.ObjectId;
  extensionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: string;
  oldStatus?: string;
  newStatus: string;
  oldAmount?: number;
  newAmount?: number;
  note?: string;
  timestamp: Date;
}

export const JobExtensionLogSchema = new Schema<IJobExtensionLog>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    extensionId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    oldStatus: { type: String },
    newStatus: { type: String, required: true },
    oldAmount: { type: Number },
    newAmount: { type: Number },
    note: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const JobExtensionLogModel = mongoose.model<IJobExtensionLog>('JobExtensionLog', JobExtensionLogSchema);

export default JobModel;
