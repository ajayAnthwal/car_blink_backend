import { generateOtp as makeOtp } from '../../../common/utils/generateOtp.util';
import { logger } from '../../../config/logger.config';
import { UserModel } from '../../user/user.model';
import { smsProvider } from '../../notification/providers/sms.provider';
import { notificationService } from '../../notification/notification.service';
import { NOTIFICATION_TYPE, NOTIFICATION_CATEGORY } from '../../notification/notification.model';

// In-memory store: key is identifier (email/phone), value is object with otp and expiry timestamp
const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>();

export const generateOtp = (): string => {
  return makeOtp();
};

export const storeOtp = async (identifier: string, otp: string): Promise<void> => {
  const expiryDurationMs = 5 * 60 * 1000; // 5 minutes
  const expiresAt = Date.now() + expiryDurationMs;
  otpStore.set(identifier, { otp, expiresAt, attempts: 0 });

  logger.info(`[OTP] Generated OTP for ${identifier}: ${otp}`);

  try {
    const isEmail = identifier.includes('@');
    const user = await UserModel.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    const otpMessage = `Your Carblink verification code is ${otp}. Valid for 5 minutes.`;

    if (user) {
      if (isEmail) {
        await notificationService.sendNotification(
          user._id.toString(),
          NOTIFICATION_TYPE.EMAIL,
          NOTIFICATION_CATEGORY.OTP,
          'Your OTP Verification Code',
          otpMessage
        );
      } else {
        await notificationService.sendNotification(
          user._id.toString(),
          NOTIFICATION_TYPE.SMS,
          NOTIFICATION_CATEGORY.OTP,
          'Your OTP Verification Code',
          otpMessage
        );
      }
    } else {
      // If user doc does not exist yet, call smsProvider directly
      if (!isEmail) {
        await smsProvider.sendSms(identifier, otpMessage);
      } else {
        logger.info(`[MOCK EMAIL OTP] to: ${identifier} | Message: ${otpMessage}`);
      }
    }
  } catch (error: any) {
    logger.error('Error sending OTP notification:', error);
  }
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

  // Increment attempts
  record.attempts += 1;
  if (record.attempts > 3) {
    otpStore.delete(identifier); // Lock out by deleting
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
