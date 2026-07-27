import mongoose, { Schema, Document } from "mongoose";

export interface IPartner extends Document {
  userId: mongoose.Types.ObjectId;
  businessName: string;
  businessAddress: string;
  cityId: mongoose.Types.ObjectId;
  servicesOffered: mongoose.Types.ObjectId[];
  gstNumber?: string;
  isVerified: boolean;
  verificationStatus: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  rejectionReason?: string;
  rating: number;
  totalReviews: number;
  dailyCapacity: number;
  blockedDates: Date[];
  outstandingDues: number;
  walletBalance: number;
  location?: {
    type: string;
    coordinates: number[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const PartnerSchema = new Schema<IPartner>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
    },
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },
    businessAddress: {
      type: String,
      required: [true, "Business address is required"],
      trim: true,
    },
    cityId: {
      type: Schema.Types.ObjectId,
      ref: "City",
      required: [true, "City ID is required"],
    },
    servicesOffered: [
      {
        type: Schema.Types.ObjectId,
        ref: "Service",
      },
    ],
    gstNumber: {
      type: String,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"],
      default: "PENDING",
      required: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    dailyCapacity: {
      type: Number,
      default: 5,
    },
    blockedDates: {
      type: [Date],
      default: [],
    },
    outstandingDues: {
      type: Number,
      default: 0,
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number],
      },
    },
  },
  {
    timestamps: true,
  },
);

PartnerSchema.index({ location: "2dsphere" });

export const PartnerModel = mongoose.model<IPartner>("Partner", PartnerSchema);
export default PartnerModel;
