import { env } from '../../../config/env.config';
import { logger } from '../../../config/logger.config';
import crypto from 'crypto';
import twilio from 'twilio';
import axios from 'axios';

export interface ISmsProvider {
  sendSms(toPhone: string, message: string): Promise<{ success: boolean; providerMessageId?: string }>;
}

const hasTwilio = Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER);
const hasMsg91 = Boolean(env.MSG91_AUTH_KEY);
const isMockMode = !hasTwilio && !hasMsg91;

if (isMockMode) {
  logger.warn('Neither MSG91 nor Twilio credentials configured — running in MOCK SMS mode');
} else if (hasMsg91) {
  logger.info('MSG91 SMS Provider initialized');
} else if (hasTwilio) {
  logger.info('Twilio SMS Provider initialized');
}

export class SmsProvider implements ISmsProvider {
  private twilioClient: any = null;

  constructor() {
    if (hasTwilio) {
      this.twilioClient = twilio(env.TWILIO_ACCOUNT_SID!, env.TWILIO_AUTH_TOKEN!);
    }
  }

  async sendSms(toPhone: string, message: string): Promise<{ success: boolean; providerMessageId?: string }> {
    // Standardize Indian phone number format (e.g. +91XXXXXXXXXX or 91XXXXXXXXXX)
    const cleanPhone = toPhone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    // 1. MSG91 Integration
    if (hasMsg91) {
      try {
        const otpMatch = message.match(/\b\d{4,6}\b/);
        const otpCode = otpMatch ? otpMatch[0] : undefined;

        // Call MSG91 SendOTP API if OTP code present
        if (otpCode && env.MSG91_TEMPLATE_ID) {
          const response = await axios.post(
            `https://control.msg91.com/api/v5/otp`,
            null,
            {
              params: {
                template_id: env.MSG91_TEMPLATE_ID,
                mobile: formattedPhone,
                otp: otpCode,
              },
              headers: {
                authkey: env.MSG91_AUTH_KEY,
              },
            }
          );

          return {
            success: true,
            providerMessageId: response.data?.request_id || response.data?.message || 'msg91_otp_sent',
          };
        }

        // Standard MSG91 Flow / SMS API fallback
        const response = await axios.post(
          'https://control.msg91.com/api/v5/flow/',
          {
            template_id: env.MSG91_TEMPLATE_ID,
            sender: env.MSG91_SENDER_ID || 'CARBLK',
            short_url: '0',
            recipients: [
              {
                mobiles: formattedPhone,
                message: message,
              },
            ],
          },
          {
            headers: {
              authkey: env.MSG91_AUTH_KEY,
              'Content-Type': 'application/json',
            },
          }
        );

        return {
          success: true,
          providerMessageId: response.data?.request_id || 'msg91_flow_sent',
        };
      } catch (err: any) {
        logger.error('MSG91 SMS send error:', err?.response?.data || err.message);
        // Fall back to Twilio or mock if MSG91 fails
      }
    }

    // 2. Twilio Integration
    if (hasTwilio && this.twilioClient) {
      try {
        const phoneWithPlus = toPhone.startsWith('+') ? toPhone : `+${formattedPhone}`;
        const response = await this.twilioClient.messages.create({
          body: message,
          to: phoneWithPlus,
          from: env.TWILIO_PHONE_NUMBER!,
        });
        return {
          success: true,
          providerMessageId: response.sid,
        };
      } catch (error: any) {
        logger.error('Twilio SMS send error:', error);
      }
    }

    // 3. Fallback Mock Mode (Prints in terminal logs for testing)
    logger.info(`[MOCK SMS] to: ${toPhone} | Message: ${message}`);
    return {
      success: true,
      providerMessageId: `mock_sms_${crypto.randomUUID().replace(/-/g, '')}`,
    };
  }
}

export const smsProvider = new SmsProvider();
export default smsProvider;
