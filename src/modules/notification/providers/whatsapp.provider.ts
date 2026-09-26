import axios from 'axios';
import { env } from '../../../config/env.config';
import { logger } from '../../../config/logger.config';

export interface IWhatsAppProvider {
  sendWhatsAppTemplate(
    toPhone: string,
    templateName: string,
    bodyValues?: string[],
    headerValues?: string[]
  ): Promise<{ success: boolean; data?: any; error?: string }>;

  sendWhatsAppText(
    toPhone: string,
    message: string
  ): Promise<{ success: boolean; data?: any; error?: string }>;
}

export class CombinedWhatsAppProvider implements IWhatsAppProvider {
  private iconicApiKey: string | undefined;
  private interaktApiKey: string | undefined;
  private whatsappToken: string | undefined;
  private phoneNumberId: string | undefined;

  constructor() {
    this.iconicApiKey = process.env.ICONIC_WA_API_KEY || '981044b7c01545f280223743c3858590';
    this.interaktApiKey = env.INTERAKT_API_KEY || process.env.INTERAKT_API_KEY;
    this.whatsappToken = (env as any).WHATSAPP_TOKEN || process.env.WHATSAPP_TOKEN;
    this.phoneNumberId = (env as any).WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (this.iconicApiKey) {
      logger.info('🟢 Iconic Solution WhatsApp Provider Initialized Successfully!');
    } else if (this.whatsappToken && this.phoneNumberId) {
      logger.info('🟢 Meta WhatsApp Cloud API Provider Initialized Successfully!');
    } else if (this.interaktApiKey) {
      logger.info('🟢 Interakt WhatsApp Provider Initialized Successfully!');
    } else {
      logger.warn('⚠️ No WhatsApp Provider Credentials found — Running in MOCK mode.');
    }
  }

  private parsePhone(toPhone: string): string {
    let digits = toPhone.replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) {
      digits = digits.replace(/^0+/, '');
    }
    return digits;
  }

  async sendWhatsAppTemplate(
    toPhone: string,
    templateName: string,
    bodyValues: string[] = [],
    headerValues: string[] = []
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const rawPhone = this.parsePhone(toPhone);
    const tenDigitPhone = rawPhone.slice(-10);
    const fullPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

    let sanitizedParams = [...bodyValues];
    if (sanitizedParams.length === 0) {
      sanitizedParams = ['CarBlink Alert', 'Notification from CarBlink'];
    } else if (sanitizedParams.length === 1) {
      sanitizedParams = ['CarBlink Alert', sanitizedParams[0]];
    }

    const otpVal = sanitizedParams[1] || sanitizedParams[0] || '';
    const activeTemplate = (templateName && templateName !== 'carblink_verification_notice') ? templateName : 'carblink_notice';

    // 1. Primary Route: Iconic Solution WhatsApp API
    if (this.iconicApiKey) {
      try {
        const response = await axios.get('http://wa.iconicsolution.co.in/wapp/api/send/otptemplate', {
          params: {
            apikey: this.iconicApiKey,
            templatename: activeTemplate,
            mobile: tenDigitPhone,
            otp: otpVal
          },
          timeout: 10000
        });

        logger.info(`[ICONIC WHATSAPP TEMPLATE SUCCESS] Sent to ${tenDigitPhone} | Res: ${JSON.stringify(response.data)}`);
        return { success: true, data: response.data };
      } catch (err: any) {
        const errMsg = err.response?.data?.message || err.message;
        logger.warn(`[ICONIC WHATSAPP WARNING] Failed for ${tenDigitPhone}: ${errMsg}. Falling back...`);
      }
    }

    // 2. Fallback Route: Meta Cloud API
    if (this.whatsappToken && this.phoneNumberId) {
      try {
        const components: any[] = [];
        if (sanitizedParams.length > 0) {
          components.push({
            type: 'body',
            parameters: sanitizedParams.map(val => ({ type: 'text', text: val }))
          });
        }

        const payload = {
          messaging_product: 'whatsapp',
          to: fullPhone,
          type: 'template',
          template: {
            name: activeTemplate,
            language: { code: 'en_US' },
            components
          }
        };

        const response = await axios.post(
          `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.whatsappToken}`
            },
            timeout: 10000
          }
        );

        logger.info(`[META WHATSAPP TEMPLATE SUCCESS] Message sent to ${fullPhone}`);
        return { success: true, data: response.data };
      } catch (err: any) {
        const errorMessage = err.response?.data?.error?.message || err.message;
        logger.warn(`[META WHATSAPP WARNING] Failed for ${fullPhone}: ${errorMessage}`);
      }
    }

    logger.info(`[MOCK WHATSAPP TEMPLATE] To: ${tenDigitPhone} | Template: ${activeTemplate}`);
    return { success: true, data: { mock: true } };
  }

  async sendWhatsAppText(
    toPhone: string,
    message: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.sendWhatsAppTemplate(toPhone, 'carblink_verification_notice', ['Customer', message]);
  }
}

export const whatsappProvider = new CombinedWhatsAppProvider();
