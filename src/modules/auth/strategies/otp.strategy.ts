import { emailProvider } from '../../notification/providers/email.provider';
import { generateOtp as makeOtp } from '../../../common/utils/generateOtp.util';
import { logger } from '../../../config/logger.config';
import { UserModel } from '../../user/user.model';
import { smsProvider } from '../../notification/providers/sms.provider';
import { notificationService } from '../../notification/notification.service';
import { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } from '../../notification/notification.model';

// In-memory store: key is identifier (email/phone), value is object with otp and expiry timestamp
const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>();
const otpCooldownMap = new Map<string, number>();

export const storeOtpOnly = (identifier: string, otp: string): void => {
  const expiryDurationMs = 5 * 60 * 1000; // 5 minutes
  const expiresAt = Date.now() + expiryDurationMs;
  const isEmail = identifier.includes('@');
  const cleanPhone = !isEmail ? identifier.trim().replace(/[^0-9]/g, '').slice(-10) : '';

  otpStore.set(identifier, { otp, expiresAt, attempts: 0 });
  if (cleanPhone) {
    otpStore.set(cleanPhone, { otp, expiresAt, attempts: 0 });
    otpStore.set(`+91${cleanPhone}`, { otp, expiresAt, attempts: 0 });
    otpStore.set(`91${cleanPhone}`, { otp, expiresAt, attempts: 0 });
  }
  logger.info(`[OTP STORE ONLY] Stored OTP for ${identifier}: ${otp}`);
};

export const generateOtp = (): string => {
  return makeOtp();
};

export const storeOtp = async (identifier: string, otp: string, purpose: 'LOGIN' | 'RESET' | 'MOBILE_VERIFY' | 'REGISTER' = 'LOGIN'): Promise<void> => {
  const isEmail = identifier.includes('@');
  const cleanPhone = !isEmail ? identifier.trim().replace(/[^0-9]/g, '').slice(-10) : '';
  const cooldownKey = cleanPhone || identifier.trim().toLowerCase();

  // Enforce 20-second rate limiting cooldown per phone/email to prevent multi-trigger SMS/WhatsApp floods
  const lastSentTime = otpCooldownMap.get(cooldownKey);
  if (lastSentTime && (Date.now() - lastSentTime) < 20000) {
    logger.info(`[OTP COOLDOWN] Request for ${cooldownKey} within 20s cooldown. Reusing active OTP.`);
    // Keep existing OTP in store so user can still verify with the active code
    const existing = otpStore.get(cooldownKey) || otpStore.get(identifier);
    if (existing) {
      return;
    }
  }

  otpCooldownMap.set(cooldownKey, Date.now());

  const expiryDurationMs = 5 * 60 * 1000; // 5 minutes
  const expiresAt = Date.now() + expiryDurationMs;

  otpStore.set(identifier, { otp, expiresAt, attempts: 0 });
  if (cleanPhone) {
    otpStore.set(cleanPhone, { otp, expiresAt, attempts: 0 });
    otpStore.set(`+91${cleanPhone}`, { otp, expiresAt, attempts: 0 });
    otpStore.set(`91${cleanPhone}`, { otp, expiresAt, attempts: 0 });
  }

  logger.info(`[OTP] Generated OTP for ${identifier}: ${otp}`);

  try {
    let otpMessage = `Your OTP for login to your Carblink account is ${otp}. This OTP is valid for 5 minutes. Please do not share this OTP with anyone.`;
    if (purpose === 'RESET') {
      otpMessage = `Your OTP to reset your Carblink account password is ${otp}. This OTP is valid for 5 minutes. Please do not share this OTP with anyone.`;
    } else if (purpose === 'MOBILE_VERIFY') {
      otpMessage = `Your OTP for mobile number verification on Carblink is ${otp}. This OTP is valid for 5minutes. Please do not share this OTP with anyone.`;
    } else if (purpose === 'REGISTER') {
      otpMessage = `Your Carblink account has been successfully registered with mobile number ${cleanPhone}. Welcome to Carblink.`;
    } else {
      otpMessage = `Your OTP for login to your Carblink account is ${otp}. This OTP is valid for 5 minutes. Please do not share this OTP with anyone.`;
    }

    if (isEmail) {
      const emailTarget = identifier.trim().toLowerCase();
      await emailProvider.sendEmail(emailTarget, 'Your OTP Verification Code', otpMessage);
    } else if (cleanPhone) {
      // 1. Send SMS exclusively to the requested phone number
      await smsProvider.sendSms(cleanPhone, otpMessage);

      // 2. Send WhatsApp exclusively to the requested phone number (Active Utility Template carblink_verification_notice)
      try {
        const { whatsappProvider } = require('../../notification/providers/whatsapp.provider');
        const waRes = await whatsappProvider.sendWhatsAppTemplate(
          cleanPhone,
          'carblink_verification_notice',
          ['Customer', otp]
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

export const verifyStoredOtp = (identifier: string, otp: string): boolean => {
  if (!identifier) return false;
  const isEmail = identifier.includes('@');
  const cleanPhone = !isEmail ? identifier.trim().replace(/[^0-9]/g, '').slice(-10) : '';

  const record = otpStore.get(identifier) ||
                 (cleanPhone ? (otpStore.get(cleanPhone) || otpStore.get(`+91${cleanPhone}`) || otpStore.get(`91${cleanPhone}`)) : undefined);

  if (!record) {
    return false;
  }

  // Check expiration
  if (Date.now() > record.expiresAt) {
    otpStore.delete(identifier);
    if (cleanPhone) {
      otpStore.delete(cleanPhone);
      otpStore.delete(`+91${cleanPhone}`);
      otpStore.delete(`91${cleanPhone}`);
    }
    return false;
  }

  // Increment attempts
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

  if (storedOtpStr !== inputOtpStr) {
    return false;
  }

  // Clear OTP on successful verification
  otpStore.delete(identifier);
  if (cleanPhone) {
    otpStore.delete(cleanPhone);
    otpStore.delete(`+91${cleanPhone}`);
    otpStore.delete(`91${cleanPhone}`);
  }
  return true;
};
export default generateOtp;
