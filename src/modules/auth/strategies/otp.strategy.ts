import { emailProvider } from '../../notification/providers/email.provider';
import { generateOtp as makeOtp } from '../../../common/utils/generateOtp.util';
import { logger } from '../../../config/logger.config';
import { UserModel } from '../../user/user.model';
import { smsProvider } from '../../notification/providers/sms.provider';
import { notificationService } from '../../notification/notification.service';
import { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } from '../../notification/notification.model';

// In-memory store: key is identifier (email/phone), value is object with otp and expiry timestamp
const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>();


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

export const storeOtp = async (identifier: string, otp: string): Promise<void> => {
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

  logger.info(`[OTP] Generated OTP for ${identifier}: ${otp}`);

  try {
    const otpMessage = `Your OTP for mobile number verification on Carblink is ${otp}. This OTP is valid for 5minutes. Please do not share this OTP with anyone.`;

    if (isEmail) {
      const emailTarget = identifier.trim().toLowerCase();
      await emailProvider.sendEmail(emailTarget, 'Your OTP Verification Code', otpMessage);
    } else if (cleanPhone) {
      // 1. Send SMS exclusively to the requested phone number
      await smsProvider.sendSms(cleanPhone, otpMessage);

      // 2. Send WhatsApp exclusively to the requested phone number
      try {
        const { whatsappProvider } = require('../../notification/providers/whatsapp.provider');
        const waRes1 = await whatsappProvider.sendWhatsAppTemplate(
          cleanPhone,
          'carblink_login_otp',
          ['Customer', otp]
        );
        logger.info(`[WhatsApp OTP Login Template] Dispatch result for ${cleanPhone}: ${JSON.stringify(waRes1)}`);

        const waRes2 = await whatsappProvider.sendWhatsAppTemplate(
          cleanPhone,
          'carblink_notification',
          ['CarBlink Verification', `Your OTP for mobile number verification on CarBlink is: ${otp}. Valid for 5 minutes.`]
        );
        logger.info(`[WhatsApp OTP Notification Template] Dispatch result for ${cleanPhone}: ${JSON.stringify(waRes2)}`);
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

  if (record.otp !== otp) {
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
