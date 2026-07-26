import mongoose, { Schema, Document } from 'mongoose';

export interface IOperationalZone extends Document {
  name: string;
  city: string;
  pincodes: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OperationalZoneSchema = new Schema<IOperationalZone>(
  {
    name: { type: String, required: true },
    city: { type: String, required: true },
    pincodes: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const OperationalZoneModel = mongoose.models.OperationalZone || mongoose.model<IOperationalZone>('OperationalZone', OperationalZoneSchema);
export default OperationalZoneModel;
