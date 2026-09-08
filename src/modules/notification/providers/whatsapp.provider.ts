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
  private interaktApiKey: string | undefined;
  private whatsappToken: string | undefined;
  private phoneNumberId: string | undefined;

  constructor() {
    this.interaktApiKey = env.INTERAKT_API_KEY || process.env.INTERAKT_API_KEY;
    this.whatsappToken = (env as any).WHATSAPP_TOKEN || process.env.WHATSAPP_TOKEN;
    this.phoneNumberId = (env as any).WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (this.whatsappToken && this.phoneNumberId) {
      logger.info('🟢 Meta WhatsApp Cloud API Provider Initialized Successfully!');
    } else if (this.interaktApiKey) {
      logger.info('🟢 Interakt WhatsApp Provider Initialized Successfully!');
    } else {
      logger.warn('⚠️ Neither Meta WHATSAPP_TOKEN nor INTERAKT_API_KEY found — Running WhatsApp Provider in MOCK mode.');
    }
  }

  private parsePhone(toPhone: string): string {
    let raw = toPhone.replace(/[^0-9]/g, '');
    if (raw.length === 10) {
      raw = '91' + raw;
    }
    return raw;
  }

  /**
   * Send WhatsApp Template Message via Meta Cloud API or Interakt API
   */
  async sendWhatsAppTemplate(
    toPhone: string,
    templateName: string,
    bodyValues: string[] = [],
    headerValues: string[] = []
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const formattedPhone = this.parsePhone(toPhone);

    // 1. Try Meta Cloud API if configured
    if (this.whatsappToken && this.phoneNumberId) {
      try {
        const components: any[] = [];
        if (bodyValues.length > 0) {
          components.push({
            type: 'body',
            parameters: bodyValues.map(val => ({ type: 'text', text: val }))
          });
        }

        const payload = {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en' },
            components
          }
        };

        const response = await axios.post(
          `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.whatsappToken}`
            },
            timeout: 10000
          }
        );

        logger.info(`[META WHATSAPP TEMPLATE SUCCESS] Message sent to ${formattedPhone}`);
        return { success: true, data: response.data };
      } catch (err: any) {
        const errorMessage = err.response?.data?.error?.message || err.message;
        logger.warn(`[META WHATSAPP WARNING] Failed for ${formattedPhone}: ${errorMessage}. Falling back...`);
      }
    }

    // 2. Fallback to Interakt API
    if (this.interaktApiKey) {
      try {
        const countryCode = '+91';
        const phoneNumber = formattedPhone.length === 12 ? formattedPhone.substring(2) : formattedPhone;

        const payload: any = {
          countryCode,
          phoneNumber,
          type: 'Template',
          template: {
            name: templateName,
            languageCode: 'en',
            bodyValues,
          },
        };

        const response = await axios.post(
          'https://api.interakt.ai/v1/public/message/',
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${this.interaktApiKey}`,
            },
            timeout: 10000,
          }
        );

        logger.info(`[INTERAKT WHATSAPP SUCCESS] Message sent to ${formattedPhone}`);
        return { success: true, data: response.data };
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message;
        logger.error(`[INTERAKT WHATSAPP ERROR] Failed for ${formattedPhone}:`, errorMessage);
        return { success: false, error: errorMessage };
      }
    }

    // Mock Mode
    logger.info(`[MOCK WHATSAPP TEMPLATE] To: ${formattedPhone} | Template: ${templateName}`);
    return { success: true, data: { mock: true } };
  }

  /**
   * Send Direct WhatsApp Text Message
   */
  async sendWhatsAppText(
    toPhone: string,
    message: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const formattedPhone = this.parsePhone(toPhone);

    // Meta Cloud API
    if (this.whatsappToken && this.phoneNumberId) {
      try {
        const response = await axios.post(
          `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedPhone,
            type: 'text',
            text: { body: message }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.whatsappToken}`
            },
            timeout: 10000
          }
        );

        logger.info(`[META WHATSAPP TEXT SUCCESS] Message sent to ${formattedPhone}`);
        return { success: true, data: response.data };
      } catch (err: any) {
        const errorMessage = err.response?.data?.error?.message || err.message;
        logger.error(`[META WHATSAPP ERROR] Failed for ${formattedPhone}:`, errorMessage);
        return { success: false, error: errorMessage };
      }
    }

    // Interakt API
    if (this.interaktApiKey) {
      try {
        const countryCode = '+91';
        const phoneNumber = formattedPhone.length === 12 ? formattedPhone.substring(2) : formattedPhone;

        const response = await axios.post(
          'https://api.interakt.ai/v1/public/message/',
          {
            countryCode,
            phoneNumber,
            type: 'Text',
            data: { message },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${this.interaktApiKey}`,
            },
            timeout: 10000,
          }
        );

        return { success: true, data: response.data };
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || err.message;
        return { success: false, error: errorMessage };
      }
    }

    logger.info(`[MOCK WHATSAPP TEXT] To: ${formattedPhone} | Msg: ${message}`);
    return { success: true, data: { mock: true } };
  }
}

export const whatsappProvider = new CombinedWhatsAppProvider();
