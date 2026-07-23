import mongoose, { Schema, Document } from 'mongoose';
export interface ICoupon extends Document {
  code: string; discountType: 'PERCENTAGE' | 'FLAT'; discountValue: number; isActive: boolean; maxUses: number; currentUses: number;
}
const schema = new Schema<ICoupon>({
  code: { type: String, required: true, unique: true }, discountType: { type: String, enum: ['PERCENTAGE', 'FLAT'], required: true },
  discountValue: { type: Number, required: true }, isActive: { type: Boolean, default: true },
  maxUses: { type: Number, default: 100 }, currentUses: { type: Number, default: 0 }
}, { timestamps: true });
export default mongoose.model<ICoupon>('Coupon', schema);