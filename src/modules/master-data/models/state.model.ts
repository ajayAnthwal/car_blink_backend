import { Schema, model, Document } from 'mongoose';

export interface IState extends Document {
  name: string;
  code?: string;
  country: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const stateSchema = new Schema<IState>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    country: { type: String, default: 'India', trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

stateSchema.index({ code: 1 });

export const StateModel = model<IState>('State', stateSchema);
