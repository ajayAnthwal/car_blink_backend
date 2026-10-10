import mongoose, { Schema, Document } from "mongoose";

export interface IPartnerVerificationLog extends Document {
  partnerId: mongoose.Types.ObjectId;
  action:
    | "REGISTRATION_SUBMITTED"
    | "DOCUMENTS_UPLOADED"
    | "MANUAL_REVIEW_REQUESTED"
    | "STATUS_CHANGED"
    | "APPROVED"
    | "ADMIN_APPROVED"
    | "REJECTED"
    | "ADMIN_REJECTED"
    | "SUSPENDED"
    | "PARTNER_SUSPENDED"
    | "RE_VERIFICATION_TRIGGERED"
    | "BANK_VERIFIED"
    | "KYC_VERIFIED"
    | "CLARIFICATION_REQUESTED"
    | "DOCUMENT_REQUESTED"
    | "DOCUMENTS_REQUESTED"
    | "REACTIVATED"
    | "PARTNER_REACTIVATED"
    | "EXECUTIVE_VERIFIED"
    | "EXECUTIVE_RECOMMENDED"
    | "DUPLICATE_FLAGGED";
  fromStatus?: string;
  toStatus?: string;
  verifierId?: mongoose.Types.ObjectId;
  notes?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const PartnerVerificationLogSchema = new Schema<IPartnerVerificationLog>(
  {
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "Partner",
      required: [true, "Partner ID is required"],
      index: true,
    },
    action: {
      type: String,
      enum: [
        "REGISTRATION_SUBMITTED",
        "DOCUMENTS_UPLOADED",
        "MANUAL_REVIEW_REQUESTED",
        "STATUS_CHANGED",
        "APPROVED",
        "ADMIN_APPROVED",
        "REJECTED",
        "ADMIN_REJECTED",
        "SUSPENDED",
        "PARTNER_SUSPENDED",
        "RE_VERIFICATION_TRIGGERED",
        "BANK_VERIFIED",
        "KYC_VERIFIED",
        "CLARIFICATION_REQUESTED",
        "DOCUMENT_REQUESTED",
        "DOCUMENTS_REQUESTED",
        "REACTIVATED",
        "PARTNER_REACTIVATED",
        "EXECUTIVE_VERIFIED",
        "EXECUTIVE_RECOMMENDED",
        "DUPLICATE_FLAGGED",
      ],
      required: [true, "Action is required"],
    },
    fromStatus: {
      type: String,
      trim: true,
    },
    toStatus: {
      type: String,
      trim: true,
    },
    verifierId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: false, // strictly uses immutable timestamp field
  }
);

// Append-only enforcement: block update and delete operations at schema/middleware level
const blockMutation = function (this: any, next: (err?: Error) => void) {
  next(new Error("PartnerVerificationLog is append-only. Updates and deletions are forbidden."));
};

PartnerVerificationLogSchema.pre("updateOne", blockMutation);
PartnerVerificationLogSchema.pre("updateMany", blockMutation);
PartnerVerificationLogSchema.pre("findOneAndUpdate", blockMutation);
PartnerVerificationLogSchema.pre("replaceOne", blockMutation);
PartnerVerificationLogSchema.pre("deleteOne", blockMutation);
PartnerVerificationLogSchema.pre("deleteMany", blockMutation);
PartnerVerificationLogSchema.pre("findOneAndDelete", blockMutation);
PartnerVerificationLogSchema.pre("findOneAndReplace", blockMutation);

export const PartnerVerificationLogModel = mongoose.model<IPartnerVerificationLog>(
  "PartnerVerificationLog",
  PartnerVerificationLogSchema
);
export default PartnerVerificationLogModel;
