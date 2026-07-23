import mongoose, { Schema, Document } from 'mongoose';
export interface ILogistics extends Document {
  bookingId: mongoose.Types.ObjectId; executiveId: mongoose.Types.ObjectId; driverName: string; driverPhone: string;
  status: 'EN_ROUTE_PICKUP' | 'AT_GARAGE' | 'EN_ROUTE_DROP' | 'COMPLETED';
  currentLocation?: { lat: number; lng: number; lastUpdatedAt: Date };
}
const schema = new Schema<ILogistics>({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  executiveId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  driverName: { type: String, required: true }, driverPhone: { type: String, required: true },
  status: { type: String, enum: ['EN_ROUTE_PICKUP', 'AT_GARAGE', 'EN_ROUTE_DROP', 'COMPLETED'], default: 'EN_ROUTE_PICKUP' },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
    lastUpdatedAt: { type: Date }
  }
}, { timestamps: true });
export default mongoose.model<ILogistics>('Logistics', schema);