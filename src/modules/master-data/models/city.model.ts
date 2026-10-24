import { Schema, model, Document, Types } from 'mongoose';

export interface ICity extends Document {
  name: string;
  state: string;
  stateId?: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const citySchema = new Schema<ICity>(
  {
    name: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    stateId: { type: Schema.Types.ObjectId, ref: 'State' },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

citySchema.index({ name: 1, state: 1 }, { unique: true });
citySchema.index({ stateId: 1 });
citySchema.index({ state: 1 });

export const CityModel = model<ICity>('City', citySchema);
