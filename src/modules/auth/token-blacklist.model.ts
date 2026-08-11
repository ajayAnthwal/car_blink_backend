import { Schema, model, Document } from 'mongoose';

export interface ITokenBlacklist extends Document {
  token: string;
  expiresAt: Date;
}

const tokenBlacklistSchema = new Schema<ITokenBlacklist>({
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true }
});

// TTL index to automatically delete expired tokens from the blacklist
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TokenBlacklistModel = model<ITokenBlacklist>('TokenBlacklist', tokenBlacklistSchema);
