import mongoose, { Schema, Document } from "mongoose";

export interface IVerificationLog extends Document {
  partnerId: mongoose.Types.ObjectId;
  partnerUserId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId;
  attemptedCode: string;
  status: "SUCCESS" | "FAILED";
  failureReason?: string;
  timestamp: Date;
}

const VerificationLogSchema = new Schema<IVerificationLog>(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: "Partner", required: true },
    partnerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    jobId: { type: Schema.Types.ObjectId, ref: "Job" },
    attemptedCode: { type: String, required: true },
    status: { type: String, enum: ["SUCCESS", "FAILED"], required: true },
    failureReason: { type: String },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const VerificationLogModel =
  mongoose.models.VerificationLog ||
  mongoose.model<IVerificationLog>("VerificationLog", VerificationLogSchema);
