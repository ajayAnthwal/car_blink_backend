import { Schema, model, Document } from 'mongoose';

export interface ICity extends Document {
  name: string;
  state: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const citySchema = new Schema<ICity>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    state: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const CityModel = model<ICity>('City', citySchema);
