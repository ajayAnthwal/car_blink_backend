import mongoose, { Schema, Document } from 'mongoose';

export interface IGarage {
  customerId: mongoose.Types.ObjectId;
  brand: string;
  model: string;
  registrationNumber: string;
  fuelType: 'PETROL' | 'DIESEL' | 'ELECTRIC' | 'CNG' | 'HYBRID';
  year?: number;
  isActive: boolean;
}

const GarageSchema = new Schema<IGarage>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
    },
    brand: {
      type: String,
      required: [true, 'Brand is required'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Model is required'],
      trim: true,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      trim: true,
      uppercase: true, // Forces uppercase saving
    },
    fuelType: {
      type: String,
      enum: {
        values: ['PETROL', 'DIESEL', 'ELECTRIC', 'CNG', 'HYBRID'],
        message: '{VALUE} is not a valid fuel type',
      },
      required: [true, 'Fuel type is required'],
    },
    year: {
      type: Number,
      min: [1900, 'Year must be after 1900'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the far future'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const GarageModel = mongoose.model<IGarage>('Garage', GarageSchema);
export default GarageModel;
