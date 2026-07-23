import mongoose, { Schema, Document } from 'mongoose';
export interface ISubscription extends Document {
  customerId: mongoose.Types.ObjectId;
  planName: string;
  startDate: Date;
  endDate: Date;
  price: number;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  servicesIncluded: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<ISubscription>({
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  planName: { type: String, required: true },
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'], default: 'ACTIVE' },
  servicesIncluded: [{ type: Schema.Types.ObjectId, ref: 'Service' }]
}, { timestamps: true });
export const SubscriptionModel = mongoose.model<ISubscription>('Subscription', schema);
export default SubscriptionModel;