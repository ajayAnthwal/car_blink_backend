import { Schema, model, Document, Types } from 'mongoose';

export interface IVehicleBrand extends Document {
  name: string;
  logo?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVehicleModel extends Document {
  brandId: Types.ObjectId | IVehicleBrand;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleBrandSchema = new Schema<IVehicleBrand>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    logo: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const vehicleModelSchema = new Schema<IVehicleModel>(
  {
    brandId: { type: Schema.Types.ObjectId, ref: 'VehicleBrand', required: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

vehicleModelSchema.index({ brandId: 1, name: 1 }, { unique: true });

export const VehicleBrandModel = model<IVehicleBrand>('VehicleBrand', vehicleBrandSchema);
export const VehicleModelModel = model<IVehicleModel>('VehicleModel', vehicleModelSchema);
