import mongoose, { Schema, Document } from 'mongoose';

export interface IGlobalSettings extends Document {
  platformCommissionRate: number;
  tdsRate: number;
  gstRate: number;
  supportEmail: string;
  supportPhone: string;
  activeBanners: string[];
  isBookingPaused: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GlobalSettingsSchema = new Schema<IGlobalSettings>(
  {
    platformCommissionRate: { type: Number, default: 15 },
    tdsRate: { type: Number, default: 1 },
    gstRate: { type: Number, default: 18 },
    supportEmail: { type: String, default: 'support@carblink.com' },
    supportPhone: { type: String, default: '1800-123-4567' },
    activeBanners: [{ type: String }],
    isBookingPaused: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const GlobalSettingsModel = mongoose.models.GlobalSettings || mongoose.model<IGlobalSettings>('GlobalSettings', GlobalSettingsSchema);
export default GlobalSettingsModel;
