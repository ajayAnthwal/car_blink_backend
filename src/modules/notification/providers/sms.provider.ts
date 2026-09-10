import { env } from '../../../config/env.config';
import { logger } from '../../../config/logger.config';
import crypto from 'crypto';
import axios from 'axios';

export interface ISmsProvider {
  sendSms(toPhone: string, message: string): Promise<{ success: boolean; providerMessageId?: string }>;
}

const hasVispl = Boolean(env.VISPL_API_KEY || (env.VISPL_USERNAME && env.VISPL_PASSWORD));

if (hasVispl) {
  logger.info('VISPL SmartPing SMS Provider initialized (pgapi.smartping.ai / pggui.vispl.in)');
} else {
  logger.warn('VISPL SMS credentials not configured — running in MOCK SMS mode');
}

export class SmsProvider implements ISmsProvider {
  async sendSms(toPhone: string, message: string): Promise<{ success: boolean; providerMessageId?: string }> {
    // Standardize Indian phone number format (10 digits)
    const cleanPhone = toPhone.replace(/[^0-9]/g, '');
    const tenDigitPhone = cleanPhone.slice(-10);

    // Sole Provider: VISPL / Smartping (pgapi.smartping.ai / pggui.vispl.in)
    if (hasVispl) {
      try {
        const baseUrl = env.VISPL_API_URL || 'https://pgapi.smartping.ai/fe/api/v1/send';

        // Extract OTP code from message if present
        const otpMatch = message.match(/\b\d{4,6}\b/);
        const otpCode = otpMatch ? otpMatch[0] : '123456';

        // Format DLT approved message text - Only use Password Reset template when message is explicitly a password reset request
        let textToSend = message;
        if (message.toLowerCase().includes('reset') || message.toLowerCase().includes('password')) {
          textToSend = `Your OTP to reset your Carblink account password is ${otpCode}. This OTP is valid for 5 minutes. Please do not share this OTP with anyone.`;
        }

        // Exact VISPL / Smartping HTTP API Parameters
        const visplParams = {
          username: env.VISPL_USERNAME || env.VISPL_API_KEY,
          password: env.VISPL_PASSWORD || env.VISPL_API_KEY,
          unicode: 'false',
          from: env.VISPL_SENDER_ID || 'CRBLNK',
          to: tenDigitPhone,
          text: textToSend,
          ...(env.VISPL_INTERNAL_TEMPLATE_ID ? { templateId: env.VISPL_INTERNAL_TEMPLATE_ID } : {}),
          ...(env.VISPL_TEMPLATE_ID ? { dltContentId: env.VISPL_TEMPLATE_ID } : {}),
          ...(env.VISPL_ENTITY_ID ? { dltPrincipalEntityId: env.VISPL_ENTITY_ID } : {}),
        };

        logger.info(`Sending SMS via VISPL SmartPing API to ${tenDigitPhone}`);

        // HTTP GET Request as per VISPL / Smartping API Spec
        const response = await axios.get(baseUrl, { params: visplParams, timeout: 8000 });

        logger.info('VISPL SmartPing SMS response:', response?.data);

        // STRICT SUCCESS CHECK: Only return success: true if statusCode is 200 AND state is SUBMIT_ACCEPTED
        const isSuccess = response.data?.statusCode === 200 && response.data?.state === 'SUBMIT_ACCEPTED';

        if (isSuccess) {
          return {
            success: true,
            providerMessageId: String(response.data?.transactionId || 'vispl_sent'),
          };
        } else {
          logger.error(`VISPL SMS Provider Delivery Failure: ${JSON.stringify(response.data)}`);
          return {
            success: false,
            providerMessageId: String(response.data?.transactionId || 'vispl_rejected'),
          };
        }
      } catch (err: any) {
        logger.error('VISPL SMS send error:', err?.response?.data || err.message);
        return {
          success: false,
          providerMessageId: 'vispl_error',
        };
      }
    }

    // Fallback Mock Mode (Only if VISPL credentials missing)
    logger.info(`[MOCK SMS] to: ${toPhone} | Message: ${message}`);
    return {
      success: true,
      providerMessageId: `mock_sms_${crypto.randomUUID().replace(/-/g, '')}`,
    };
  }
}

export const smsProvider = new SmsProvider();
export default smsProvider;
