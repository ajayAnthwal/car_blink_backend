import { Schema, model, Document } from 'mongoose';

export interface IActivityLog extends Document {
  accountsId: Schema.Types.ObjectId;
  action: string;
  amount: number;
  details: string;
  createdAt: Date;
  updatedAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    accountsId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    amount: { type: Number, default: 0 },
    details: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const ActivityLogModel = model<IActivityLog>('ActivityLog', activityLogSchema);
