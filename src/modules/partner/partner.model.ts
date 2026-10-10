import mongoose, { Schema, Document } from "mongoose";

export interface IDuplicateFlag {
  field: "MOBILE" | "PAN" | "GSTIN" | "REGISTRATION_NO" | "BANK_ACCOUNT" | "LOCATION_PROXIMITY" | "NAME_SIMILARITY" | "ADDRESS_SIMILARITY";
  reason: string;
  flaggedAt: Date;
  matchedPartnerId?: mongoose.Types.ObjectId;
  matchedUniquePartnerId?: string;
  matchedWorkshopName?: string;
  matchedValue?: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

export interface IPartner extends Document {
  userId: mongoose.Types.ObjectId;
  // Unique identification
  uniquePartnerId?: string;
  isActive: boolean;

  // Basic Details
  businessName: string; // Kept for backward compatibility
  workshopName?: string;
  normalizedWorkshopName?: string;
  ownerName?: string;
  mobile?: string;
  mobileVerified: boolean;
  email?: string;
  emailVerified: boolean;
  businessType?: "Proprietorship" | "Partnership" | "LLP" | "Company" | "Other";

  // Address & Geolocation
  businessAddress: string; // Kept for backward compatibility
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  cityId?: mongoose.Types.ObjectId;
  location?: {
    type: string;
    coordinates: number[];
  };

  // Verification Lifecycle
  // Note: 'APPROVED' and 'PENDING' are legacy enum values preserved for backward compatibility
  verificationStatus:
    | "REGISTRATION_SUBMITTED"
    | "DOCUMENTS_PENDING"
    | "UNDER_REVIEW"
    | "MANUAL_VERIFICATION_REQUIRED"
    | "REJECTED"
    | "APPROVED_VERIFIED"
    | "SUSPENDED"
    | "APPROVED" // [LEGACY] handle deliberately in assignment filter
    | "PENDING"; // [LEGACY]
  isVerified: boolean;
  executiveVerificationStatus?: "PENDING" | "APPROVED" | "REJECTED";
  executiveVerifiedBy?: mongoose.Types.ObjectId;
  executiveVerifiedAt?: Date;
  adminApprovedBy?: mongoose.Types.ObjectId;
  adminApprovedAt?: Date;
  rejectionReason?: string;

  // KYC & Tax Registration
  pan?: string;
  panStatus?: "PENDING" | "VERIFIED" | "FAILED";
  gstin?: string;
  gstStatus?: "PENDING" | "VERIFIED" | "FAILED";
  gstLegalName?: string;
  gstTradeName?: string;
  gstRegistrationStatus?: string;
  isGstRegistered: boolean;
  gstNumber?: string; // Kept for backward compatibility
  msmeNumber?: string; // Kept for backward compatibility
  nonGstProofType?: string;
  proofRef?: string;
  udyamNumber?: string;
  udyamStatus?: "PENDING" | "VERIFIED" | "FAILED";
  businessRegistrationProofRef?: string;

  // Representative Details
  isRepresentative: boolean;
  authorizationDocRef?: string;
  representativeDetails?: {
    fullName?: string;
    mobile?: string;
    email?: string;
    designation?: string;
  };

  // Physical Workshop Verification Proofs
  exteriorPhotoRef?: string;
  interiorPhotoRef?: string;
  signboardPhotoRef?: string;
  addressProofType?: "ELECTRICITY_BILL" | "RENT_AGREEMENT" | "LEASE_DEED" | "PROPERTY_TAX" | "OTHER";
  addressProofRef?: string;

  // Bank Details & Payout
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  bankProofRef?: string;
  bankVerificationStatus?: "PENDING" | "VERIFIED" | "FAILED";
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
  };

  // Virtual for masked bank account number
  maskedAccountNumber?: string;

  // Capabilities & Operations
  services?: (
    | "Mechanical"
    | "General Service"
    | "AC"
    | "Electrical"
    | "Denting/Painting"
    | "Detailing"
    | "PPF"
    | "Ceramic"
    | "Car Wash"
    | "Tyres"
    | "Battery"
    | "Insurance Repair"
    | "Body Shop"
    | "Other"
  )[];
  servicesOffered: mongoose.Types.ObjectId[]; // Kept for backward compatibility with Service model refs
  serviceBays: number;
  technicianCount: number;
  workingDays?: string[];
  workingHours?: {
    open?: string;
    close?: string;
  };
  pickupDropAvailable: boolean;
  insuranceWorkCapable: boolean;
  authorizedServiceClaim: boolean;
  authorizedServiceProofRef?: string;

  // Capacity & Operations
  rating: number;
  totalReviews: number;
  dailyCapacity: number;
  blockedDates: Date[];
  outstandingDues: number;
  walletBalance: number;

  // Flags & Auditing
  duplicateFlags?: IDuplicateFlag[];
  reVerificationRequired: boolean;
  reVerificationDetails?: {
    changedFields: string[];
    requestedAt: Date;
    oldValues: Record<string, any>;
    newValues: Record<string, any>;
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
    uniquePartnerId: {
      type: String,
      trim: true,
      // Left undefined until approved (no default null)
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    businessName: {
      type: String,
      trim: true,
      default: "Workshop",
    },
    workshopName: {
      type: String,
      trim: true,
    },
    normalizedWorkshopName: {
      type: String,
      trim: true,
      lowercase: true,
    },
    ownerName: {
      type: String,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
    },
    mobileVerified: {
      type: Boolean,
      default: false,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    businessType: {
      type: String,
      enum: ["Proprietorship", "Partnership", "LLP", "Company", "Other"],
    },
    businessAddress: {
      type: String,
      trim: true,
      default: "",
    },
    addressLine: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    cityId: {
      type: Schema.Types.ObjectId,
      ref: "City",
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
    msmeNumber: {
      type: String,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: [
        "REGISTRATION_SUBMITTED",
        "DOCUMENTS_PENDING",
        "UNDER_REVIEW",
        "MANUAL_VERIFICATION_REQUIRED",
        "REJECTED",
        "APPROVED_VERIFIED",
        "SUSPENDED",
        // Legacy enum values preserved for backward compatibility
        "APPROVED",
        "PENDING",
      ],
      default: "REGISTRATION_SUBMITTED",
      required: true,
    },
    executiveVerificationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    executiveVerifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    executiveVerifiedAt: {
      type: Date,
    },
    adminApprovedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    adminApprovedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
    },
    panStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "FAILED"],
      default: "PENDING",
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    gstStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "FAILED"],
      default: "PENDING",
    },
    gstLegalName: {
      type: String,
      trim: true,
    },
    gstTradeName: {
      type: String,
      trim: true,
    },
    gstRegistrationStatus: {
      type: String,
      trim: true,
    },
    isGstRegistered: {
      type: Boolean,
      default: false,
    },
    nonGstProofType: {
      type: String,
      trim: true,
    },
    proofRef: {
      type: String,
      trim: true,
    },
    udyamNumber: {
      type: String,
      trim: true,
    },
    udyamStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "FAILED"],
    },
    businessRegistrationProofRef: {
      type: String,
      trim: true,
    },
    isRepresentative: {
      type: Boolean,
      default: false,
    },
    authorizationDocRef: {
      type: String,
      trim: true,
    },
    representativeDetails: {
      fullName: { type: String, trim: true },
      mobile: { type: String, trim: true },
      email: { type: String, trim: true },
      designation: { type: String, trim: true },
    },
    exteriorPhotoRef: {
      type: String,
      trim: true,
    },
    interiorPhotoRef: {
      type: String,
      trim: true,
    },
    signboardPhotoRef: {
      type: String,
      trim: true,
    },
    addressProofType: {
      type: String,
      enum: ["ELECTRICITY_BILL", "RENT_AGREEMENT", "LEASE_DEED", "PROPERTY_TAX", "OTHER"],
    },
    addressProofRef: {
      type: String,
      trim: true,
    },
    accountHolderName: {
      type: String,
      trim: true,
    },
    bankName: {
      type: String,
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    ifsc: {
      type: String,
      trim: true,
      uppercase: true,
    },
    bankProofRef: {
      type: String,
      trim: true,
    },
    bankVerificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "FAILED"],
      default: "PENDING",
    },
    bankDetails: {
      accountNumber: { type: String },
      ifscCode: { type: String },
      accountHolderName: { type: String },
    },
    services: [
      {
        type: String,
        enum: [
          "Mechanical",
          "General Service",
          "AC",
          "Electrical",
          "Denting/Painting",
          "Detailing",
          "PPF",
          "Ceramic",
          "Car Wash",
          "Tyres",
          "Battery",
          "Insurance Repair",
          "Body Shop",
          "Other",
        ],
      },
    ],
    serviceBays: {
      type: Number,
      default: 1,
    },
    technicianCount: {
      type: Number,
      default: 1,
    },
    workingDays: [
      {
        type: String,
      },
    ],
    workingHours: {
      open: { type: String, trim: true },
      close: { type: String, trim: true },
    },
    pickupDropAvailable: {
      type: Boolean,
      default: false,
    },
    insuranceWorkCapable: {
      type: Boolean,
      default: false,
    },
    authorizedServiceClaim: {
      type: Boolean,
      default: false,
    },
    authorizedServiceProofRef: {
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
    duplicateFlags: [
      {
        field: { type: String, trim: true },
        reason: { type: String, trim: true },
        flaggedAt: { type: Date, default: Date.now },
        matchedPartnerId: { type: Schema.Types.ObjectId, ref: "Partner" },
        matchedUniquePartnerId: { type: String, trim: true },
        matchedWorkshopName: { type: String, trim: true },
        matchedValue: { type: String, trim: true },
        severity: { type: String, enum: ["HIGH", "MEDIUM", "LOW"], default: "MEDIUM" },
      },
    ],
    reVerificationRequired: {
      type: Boolean,
      default: false,
    },
    reVerificationDetails: {
      changedFields: [{ type: String }],
      requestedAt: { type: Date },
      oldValues: { type: Schema.Types.Mixed },
      newValues: { type: Schema.Types.Mixed },
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [77.209, 28.6139],
      },
    },
  },
  {
    timestamps: true,
  }
);

// Unique index on uniquePartnerId using partialFilterExpression (only index non-null string values)
PartnerSchema.index(
  { uniquePartnerId: 1 },
  {
    unique: true,
    partialFilterExpression: { uniquePartnerId: { $type: "string" } },
  }
);

PartnerSchema.index({ location: "2dsphere" });

// Virtual for masked bank account number
PartnerSchema.virtual("maskedAccountNumber").get(function (this: IPartner) {
  const acc = this.accountNumber || this.bankDetails?.accountNumber;
  if (!acc || acc.length < 4) return undefined;
  return "•".repeat(Math.max(0, acc.length - 4)) + acc.slice(-4);
});

// Mask bank account number by default when serializing
PartnerSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    const masked = doc.maskedAccountNumber;
    if (ret.accountNumber) {
      ret.accountNumber = masked || "••••••••";
    }
    if (ret.bankDetails?.accountNumber) {
      ret.bankDetails.accountNumber = masked || "••••••••";
    }
    return ret;
  },
});

PartnerSchema.set("toObject", {
  virtuals: true,
  transform: (doc, ret) => {
    const masked = doc.maskedAccountNumber;
    if (ret.accountNumber) {
      ret.accountNumber = masked || "••••••••";
    }
    if (ret.bankDetails?.accountNumber) {
      ret.bankDetails.accountNumber = masked || "••••••••";
    }
    return ret;
  },
});

// Middleware to sync workshopName <-> businessName & normalizedWorkshopName
PartnerSchema.pre("save", function (next) {
  if (this.workshopName && !this.normalizedWorkshopName) {
    this.normalizedWorkshopName = this.workshopName.toLowerCase().trim();
  }
  if (!this.businessName && this.workshopName) {
    this.businessName = this.workshopName;
  }
  if (!this.workshopName && this.businessName) {
    this.workshopName = this.businessName;
    if (!this.normalizedWorkshopName) {
      this.normalizedWorkshopName = this.businessName.toLowerCase().trim();
    }
  }
  next();
});

export const PartnerModel = mongoose.model<IPartner>("Partner", PartnerSchema);
export default PartnerModel;
