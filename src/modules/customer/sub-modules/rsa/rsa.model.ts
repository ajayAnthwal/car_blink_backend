import mongoose, { Schema, Document } from 'mongoose';
export interface IRsa extends Document {
  customerId: mongoose.Types.ObjectId;
  vehicleId: mongoose.Types.ObjectId;
  location: { lat: number; lng: number };
  issueType: string;
  status: 'PENDING' | 'ASSIGNED' | 'RESOLVED' | 'CANCELLED';
  assignedPartnerId?: mongoose.Types.ObjectId;
  cost?: number;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<IRsa>({
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  location: { lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  issueType: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'ASSIGNED', 'RESOLVED', 'CANCELLED'], default: 'PENDING' },
  assignedPartnerId: { type: Schema.Types.ObjectId, ref: 'User' },
  cost: { type: Number }
}, { timestamps: true });
export const RsaModel = mongoose.model<IRsa>('Rsa', schema);
export default RsaModel;