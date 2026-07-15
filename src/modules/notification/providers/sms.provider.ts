import { env } from '../../../config/env.config';
import { logger } from '../../../config/logger.config';
import crypto from 'crypto';
import twilio from 'twilio';

export interface ISmsProvider {
  sendSms(toPhone: string, message: string): Promise<{ success: boolean; providerMessageId?: string }>;
}

const isMockMode = !env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_PHONE_NUMBER;

if (isMockMode) {
  logger.warn('Twilio SMS credentials not configured — running in MOCK SMS mode');
}

export class SmsProvider implements ISmsProvider {
  private client: any = null;

  constructor() {
    if (!isMockMode) {
      this.client = twilio(env.TWILIO_ACCOUNT_SID!, env.TWILIO_AUTH_TOKEN!);
    }
  }

  async sendSms(toPhone: string, message: string): Promise<{ success: boolean; providerMessageId?: string }> {
    if (isMockMode) {
      logger.info(`[MOCK SMS] to: ${toPhone} | Message: ${message}`);
      return {
        success: true,
        providerMessageId: `mock_sms_${crypto.randomUUID().replace(/-/g, '')}`,
      };
    }

    try {
      const response = await this.client.messages.create({
        body: message,
        to: toPhone,
        from: env.TWILIO_PHONE_NUMBER!,
      });
      return {
        success: true,
        providerMessageId: response.sid,
      };
    } catch (error: any) {
      logger.error('Twilio SMS send error:', error);
      return { success: false };
    }
  }
}

export const smsProvider = new SmsProvider();
