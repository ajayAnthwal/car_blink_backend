import mongoose, { Schema, Document } from 'mongoose';

export enum NOTIFICATION_TYPE {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export enum NOTIFICATION_CATEGORY {
  OTP = 'OTP',
  BOOKING_UPDATE = 'BOOKING_UPDATE',
  BID_RECEIVED = 'BID_RECEIVED',
  QUOTE_ACCEPTED = 'QUOTE_ACCEPTED',
  JOB_STATUS = 'JOB_STATUS',
  PAYMENT_UPDATE = 'PAYMENT_UPDATE',
  SUPPORT_TICKET = 'SUPPORT_TICKET',
  ESCALATION = 'ESCALATION',
  GENERAL = 'GENERAL',
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',
}

export enum NOTIFICATION_STATUS {
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NOTIFICATION_TYPE;
  category: NOTIFICATION_CATEGORY;
  title: string;
  message: string;
  status: NOTIFICATION_STATUS;
  providerMessageId?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      required: [true, 'Notification type is required'],
    },
    category: {
      type: String,
      enum: Object.values(NOTIFICATION_CATEGORY),
      required: [true, 'Notification category is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(NOTIFICATION_STATUS),
      required: [true, 'Status is required'],
    },
    providerMessageId: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    isRead: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

export const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema);
export default NotificationModel;
