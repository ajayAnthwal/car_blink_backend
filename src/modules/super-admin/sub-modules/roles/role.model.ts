import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomRole extends Document {
  name: string;
  description?: string;
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomRoleSchema = new Schema<ICustomRole>(
  {
    name: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String },
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model<ICustomRole>('CustomRole', CustomRoleSchema);
