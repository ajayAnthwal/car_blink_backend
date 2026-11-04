import mongoose, { Schema, Document } from 'mongoose';

export enum LEAD_SOURCE {
  WEBSITE_QUOTE = 'WEBSITE_QUOTE',
  WEBSITE_CONTACT = 'WEBSITE_CONTACT',
  QUICK_CALLBACK = 'QUICK_CALLBACK',
  WORKSHOP_PARTNER = 'WORKSHOP_PARTNER',
}

export enum LEAD_STATUS {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  CONVERTED = 'CONVERTED',
  CLOSED = 'CLOSED',
}

export interface ILead extends Document {
  name: string;
  phone: string;
  email?: string;
  source: LEAD_SOURCE;
  status: LEAD_STATUS;
  customerId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  cityId?: mongoose.Types.ObjectId;
  serviceIds?: mongoose.Types.ObjectId[];
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleNumber?: string;
  fuelType?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  services?: string[];
  city?: string;
  message?: string;
  query?: string;
  customServiceName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    source: { 
      type: String, 
      enum: Object.values(LEAD_SOURCE), 
      required: true 
    },
    status: { 
      type: String, 
      enum: Object.values(LEAD_STATUS), 
      default: LEAD_STATUS.NEW 
    },
    customerId: { type: Schema.Types.ObjectId, ref: 'User' },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    cityId: { type: Schema.Types.ObjectId, ref: 'City' },
    serviceIds: [{ type: Schema.Types.ObjectId, ref: 'Service' }],
    vehicleBrand: { type: String, trim: true },
    vehicleModel: { type: String, trim: true },
    vehicleNumber: { type: String, trim: true },
    fuelType: { type: String, trim: true },
    address: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    services: [{ type: String, trim: true }],
    city: { type: String, trim: true },
    message: { type: String, trim: true },
    customServiceName: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

LeadSchema.index({ phone: 1 });
LeadSchema.index({ status: 1 });
LeadSchema.index({ source: 1 });
LeadSchema.index({ bookingId: 1 });

export const LeadModel = mongoose.model<ILead>('Lead', LeadSchema);
export default LeadModel;
