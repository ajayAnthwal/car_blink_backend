import { generateOtp as makeOtp } from '../../../common/utils/generateOtp.util';
import { logger } from '../../../config/logger.config';

// In-memory store: key is identifier (email/phone), value is object with otp and expiry timestamp
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export const generateOtp = (): string => {
  return makeOtp();
};

export const storeOtp = (identifier: string, otp: string): void => {
  const expiryDurationMs = 5 * 60 * 1000; // 5 minutes
  const expiresAt = Date.now() + expiryDurationMs;
  otpStore.set(identifier, { otp, expiresAt });

  logger.info(`[OTP] Generated OTP for ${identifier}: ${otp}`);
  // TODO: integrate real SMS/Email provider in notification module
};

export const verifyStoredOtp = (identifier: string, otp: string): boolean => {
  const record = otpStore.get(identifier);
  if (!record) {
    return false;
  }

  // Check expiration
  if (Date.now() > record.expiresAt) {
    otpStore.delete(identifier);
    return false;
  }

  if (record.otp !== otp) {
    return false;
  }

  // Clear OTP on successful verification
  otpStore.delete(identifier);
  return true;
};
export default generateOtp;
