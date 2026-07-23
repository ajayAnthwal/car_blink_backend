import mongoose, { Schema, Document } from 'mongoose';
export interface IStaff extends Document {
  partnerId: mongoose.Types.ObjectId;
  name: string; phone: string; role: string; status: 'ACTIVE' | 'INACTIVE';
}
const schema = new Schema<IStaff>({
  partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true }, phone: { type: String, required: true },
  role: { type: String, required: true }, status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
}, { timestamps: true });
export default mongoose.model<IStaff>('Staff', schema);