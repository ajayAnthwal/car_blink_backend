import crypto from 'crypto';
import { emailProvider } from '../../notification/providers/email.provider';
import { logger } from '../../../config/logger.config';
import { smsProvider } from '../../notification/providers/sms.provider';
import { ApiError } from '../../../common/errors/ApiError';

// In-memory store: key is identifier (email/phone), value is object with otp, expiry, attempts, and purpose
// Note: In-memory storage is ephemeral and bound to the current server process.
export const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number; purpose?: string }>();
const otpCooldownMap = new Map<string, number>();

// Partner-specific resend tracking (15-minute window, max 3 resends)
const partnerResendTracker = new Map<string, { count: number; windowStart: number }>();

export const storeOtpOnly = (identifier: string, otp: string, purpose?: string): void => {
  const expiryDurationMs = 5 * 60 * 1000; // 5 minutes
  const expiresAt = Date.now() + expiryDurationMs;
  const isEmail = identifier.includes('@');
  const cleanPhone = !isEmail ? identifier.trim().replace(/[^0-9]/g, '').slice(-10) : '';

  const entry = { otp, expiresAt, attempts: 0, purpose };
  otpStore.set(identifier, entry);
  if (cleanPhone) {
    otpStore.set(cleanPhone, entry);
    otpStore.set(`+91${cleanPhone}`, entry);
    otpStore.set(`91${cleanPhone}`, entry);
  }
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[OTP STORE ONLY] Stored OTP for ${identifier}: ${otp}`);
  }
};

/**
 * Generate a cryptographically secure 6-digit OTP using crypto.randomInt
 */
export const generateOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

export const storeOtp = async (
  identifier: string,
  otp: string,
  purpose: 'LOGIN' | 'RESET' | 'MOBILE_VERIFY' | 'REGISTER' | 'PARTNER_REGISTER' = 'LOGIN'
): Promise<void> => {
  const isEmail = identifier.includes('@');
  const cleanPhone = !isEmail ? identifier.trim().replace(/[^0-9]/g, '').slice(-10) : '';
  const cooldownKey = cleanPhone || identifier.trim().toLowerCase();

  // Partner-specific strict resend rate limiting (max 3 resends per 15 minutes)
  if (purpose === 'PARTNER_REGISTER' && cleanPhone) {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const tracker = partnerResendTracker.get(cleanPhone);

    if (tracker) {
      if (now - tracker.windowStart < windowMs) {
        if (tracker.count >= 3) {
          const remainingMinutes = Math.ceil((windowMs - (now - tracker.windowStart)) / 60000);
          throw new ApiError(
            429,
            `Too many OTP requests for this partner mobile number. Please wait ${remainingMinutes} minute(s) before requesting a new code.`
          );
        }
        tracker.count += 1;
      } else {
        // Window expired, reset window
        partnerResendTracker.set(cleanPhone, { count: 1, windowStart: now });
      }
    } else {
      partnerResendTracker.set(cleanPhone, { count: 1, windowStart: now });
    }
  }

  // 20-second general cooldown to prevent rapid accidental double-clicks
  const lastSentTime = otpCooldownMap.get(cooldownKey);
  if (lastSentTime && Date.now() - lastSentTime < 20000) {
    logger.info(`[OTP COOLDOWN] Request for ${cooldownKey} within 20s cooldown. Reusing active OTP.`);
    const existing = otpStore.get(cooldownKey) || otpStore.get(identifier);
    if (existing) {
      return;
    }
  }

  otpCooldownMap.set(cooldownKey, Date.now());

  const expiryDurationMs = 5 * 60 * 1000; // 5 minutes expiry
  const expiresAt = Date.now() + expiryDurationMs;

  const record = { otp, expiresAt, attempts: 0, purpose };
  otpStore.set(identifier, record);
  if (cleanPhone) {
    otpStore.set(cleanPhone, record);
    otpStore.set(`+91${cleanPhone}`, record);
    otpStore.set(`91${cleanPhone}`, record);
  }

  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[OTP] Generated OTP for ${identifier}: ${otp}`);
  }

  try {
    let otpMessage = `Your OTP for login to your Carblink account is ${otp}. This OTP is valid for 5 minutes. Please do not share this OTP with anyone.`;
    if (purpose === 'RESET') {
      otpMessage = `Your OTP to reset your Carblink account password is ${otp}. This OTP is valid for 5 minutes. Please do not share this OTP with anyone.`;
    } else if (purpose === 'MOBILE_VERIFY' || purpose === 'PARTNER_REGISTER' || purpose === 'REGISTER') {
      otpMessage = `Your OTP for mobile number verification on Carblink is ${otp}. This OTP is valid for 5minutes. Please do not share this OTP with anyone.`;
    } else {
      otpMessage = `Your OTP for login to your Carblink account is ${otp}. This OTP is valid for 5 minutes. Please do not share this OTP with anyone.`;
    }

    if (isEmail) {
      const emailTarget = identifier.trim().toLowerCase();
      await emailProvider.sendEmail(emailTarget, 'Your OTP Verification Code', otpMessage);
    } else if (cleanPhone) {
      // 1. Send SMS
      await smsProvider.sendSms(cleanPhone, otpMessage);

      // 2. Send WhatsApp
      try {
        const { whatsappProvider } = require('../../notification/providers/whatsapp.provider');
        const waRes = await whatsappProvider.sendWhatsAppTemplate(
          cleanPhone,
          'carblink_verification_notice',
          [purpose === 'PARTNER_REGISTER' ? 'Partner' : 'Customer', otp]
        );
        logger.info(`[WhatsApp OTP Dispatch] Result for ${cleanPhone}: ${JSON.stringify(waRes)}`);
      } catch (waErr: any) {
        logger.warn('[OTP Strategy] WhatsApp OTP dispatch warning:', waErr?.message || waErr);
      }
    }
  } catch (error: any) {
    logger.error('Error sending OTP notification:', error);
  }
};

export const verifyStoredOtp = (identifier: string, otp: string, requiredPurpose?: string): boolean => {
  if (!identifier) return false;
  const isEmail = identifier.includes('@');
  const cleanPhone = !isEmail ? identifier.trim().replace(/[^0-9]/g, '').slice(-10) : '';

  const record =
    otpStore.get(identifier) ||
    (cleanPhone
      ? otpStore.get(cleanPhone) || otpStore.get(`+91${cleanPhone}`) || otpStore.get(`91${cleanPhone}`)
      : undefined);

  if (!record) {
    return false;
  }

  // Check optional purpose binding if supplied
  if (requiredPurpose && record.purpose && record.purpose !== requiredPurpose) {
    return false;
  }

  // Check expiration (5 minutes)
  if (Date.now() > record.expiresAt) {
    otpStore.delete(identifier);
    if (cleanPhone) {
      otpStore.delete(cleanPhone);
      otpStore.delete(`+91${cleanPhone}`);
      otpStore.delete(`91${cleanPhone}`);
    }
    return false;
  }

  // Increment attempts (Max 3 attempts)
  record.attempts += 1;
  if (record.attempts > 3) {
    otpStore.delete(identifier);
    if (cleanPhone) {
      otpStore.delete(cleanPhone);
      otpStore.delete(`+91${cleanPhone}`);
      otpStore.delete(`91${cleanPhone}`);
    }
    return false;
  }

  const inputOtpStr = String(otp || '').trim();
  const storedOtpStr = String(record.otp || '').trim();
  const isDev = process.env.NODE_ENV !== 'production';
  const isMockOtp = isDev && (inputOtpStr === '123456' || inputOtpStr === '000000' || inputOtpStr === '1234');

  if (storedOtpStr !== inputOtpStr && !isMockOtp) {
    return false;
  }

  // Single-use: invalidate OTP immediately upon successful verification
  otpStore.delete(identifier);
  if (cleanPhone) {
    otpStore.delete(cleanPhone);
    otpStore.delete(`+91${cleanPhone}`);
    otpStore.delete(`91${cleanPhone}`);
  }
  return true;
};

export default generateOtp;
