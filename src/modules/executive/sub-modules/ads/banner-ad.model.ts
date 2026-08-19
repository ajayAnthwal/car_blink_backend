import mongoose, { Schema, Document } from 'mongoose';

export interface IBannerAd extends Document {
  title: string;
  subtitle?: string;
  imageUrl: string;
  redirectUrl?: string;
  placement: 'HOME_HERO' | 'HOME_MIDDLE' | 'OFFERS';
  isActive: boolean;
  priorityOrder: number;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BannerAdSchema = new Schema<IBannerAd>(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    redirectUrl: { type: String, trim: true },
    placement: {
      type: String,
      enum: ['HOME_HERO', 'HOME_MIDDLE', 'OFFERS'],
      default: 'HOME_HERO',
    },
    isActive: { type: Boolean, default: true },
    priorityOrder: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const BannerAdModel = mongoose.model<IBannerAd>('BannerAd', BannerAdSchema);
export default BannerAdModel;
