import mongoose, { Schema, Document } from 'mongoose';
export interface IPos extends Document {
  partnerId: mongoose.Types.ObjectId;
  customerName: string; customerPhone: string; totalAmount: number; paymentStatus: 'PAID' | 'PENDING'; items: any[];
}
const schema = new Schema<IPos>({
  partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, required: true }, customerPhone: { type: String, required: true },
  totalAmount: { type: Number, required: true }, paymentStatus: { type: String, enum: ['PAID', 'PENDING'], default: 'PENDING' },
  items: [{ type: Schema.Types.Mixed }]
}, { timestamps: true });
export default mongoose.model<IPos>('Pos', schema);