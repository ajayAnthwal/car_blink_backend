import { Schema, model, Document } from 'mongoose';

export interface IService extends Document {
  name: string;
  icon: string;
  category?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    icon: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const ServiceModel = model<IService>('Service', serviceSchema);
