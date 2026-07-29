import mongoose, { Schema, Document } from 'mongoose';

export interface IPlan extends Document {
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  durationMonths: number;
  features: string[];
  isPopular?: boolean;
  isActive: boolean;
}

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    durationMonths: { type: Number, required: true, default: 12 },
    features: [{ type: String }],
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PlanModel = mongoose.model<IPlan>('Plan', PlanSchema);
export default PlanModel;
