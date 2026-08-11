import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import { ROLES } from '../../common/constants/roles.constant';

export interface IUser extends Document {
  fullName: string;
  email?: string;
  phone: string;
  password?: string;
  role: ROLES;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isActive: boolean;
  customRoleId?: Schema.Types.ObjectId;
  profileImage?: string;
  lastLoginAt?: Date;
  totalSavings?: number;
  rewardPoints?: number;
  deviceTokens?: string[];
  location?: {
    type: string;
    coordinates: number[];
  };
  address?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true },
    isPhoneVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    profileImage: { type: String },
    customRoleId: { type: Schema.Types.ObjectId, ref: 'CustomRole' },
    lastLoginAt: { type: Date },
    deviceTokens: { type: [String], default: [] },
    totalSavings: { type: Number, default: 0 },
    rewardPoints: { type: Number, default: 0 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], index: '2dsphere' }
    },
    address: { type: String }
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
