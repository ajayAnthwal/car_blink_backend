import { Schema, model, Document } from 'mongoose';

export interface IService extends Document {
  name: string;
  slug: string;
  icon: string;
  category?: string;
  description?: string;
  fullDescription?: string;
  price?: number;
  estimatedDuration?: string;
  includedServices?: string[];
  benefits?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    icon: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    description: { type: String, trim: true },
    fullDescription: { type: String, trim: true },
    price: { type: Number },
    estimatedDuration: { type: String, trim: true },
    includedServices: [{ type: String }],
    benefits: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const ServiceModel = model<IService>('Service', serviceSchema);
