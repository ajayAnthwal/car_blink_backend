import mongoose, { Schema, Document } from 'mongoose';
export interface IReferral extends Document {
  referrerId: mongoose.Types.ObjectId;
  referredId: mongoose.Types.ObjectId;
  referralCodeUsed: string;
  status: 'PENDING' | 'REWARDED';
  rewardAmount: number;
}
const schema = new Schema<IReferral>({
  referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  referredId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  referralCodeUsed: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'REWARDED'], default: 'PENDING' },
  rewardAmount: { type: Number, required: true }
}, { timestamps: true });
export default mongoose.model<IReferral>('Referral', schema);