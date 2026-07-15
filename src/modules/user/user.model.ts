import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import { ROLES } from '../../common/constants/roles.constant';

export interface IUser extends Document {
  fullName: string;
  email: string;
  phone: string;
  password?: string;
  role: ROLES;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isActive: boolean;
  profileImage?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true },
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    profileImage: { type: String },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to hash password
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password || '', salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password || '');
};

export const UserModel = model<IUser>('User', userSchema);
