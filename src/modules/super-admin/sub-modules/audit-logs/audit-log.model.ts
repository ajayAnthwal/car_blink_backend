import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  userRole?: string;
  action: string;
  endpoint: string;
  method: string;
  payload?: any;
  ipAddress?: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userRole: { type: String },
    action: { type: String, required: true },
    endpoint: { type: String, required: true },
    method: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

// Indexes for faster querying
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
