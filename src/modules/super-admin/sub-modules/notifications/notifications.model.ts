import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationHistory extends Document {
  title: string;
  body: string;
  targetAudience: 'CUSTOMERS' | 'PARTNERS' | 'ALL';
  sentBy: mongoose.Types.ObjectId;
  sentAt: Date;
}

const NotificationHistorySchema = new Schema<INotificationHistory>(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    targetAudience: { type: String, enum: ['CUSTOMERS', 'PARTNERS', 'ALL'], required: true },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const NotificationHistoryModel = mongoose.models.NotificationHistory || mongoose.model<INotificationHistory>('NotificationHistory', NotificationHistorySchema);
export default NotificationHistoryModel;
