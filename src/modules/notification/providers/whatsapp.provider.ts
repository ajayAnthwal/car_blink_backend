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

export class InteraktWhatsAppProvider implements IWhatsAppProvider {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = env.INTERAKT_API_KEY || process.env.INTERAKT_API_KEY;
    if (this.apiKey) {
      logger.info('🟢 Interakt WhatsApp Provider Initialized Successfully!');
    } else {
      logger.warn('⚠️ INTERAKT_API_KEY not found in environment — Running Interakt WhatsApp Provider in MOCK mode.');
    }
  }

  /**
   * Clean and format Indian phone numbers for Interakt API (+91 country code & 10-digit number)
   */
  private parsePhone(toPhone: string): { countryCode: string; phoneNumber: string } {
    const raw = toPhone.replace(/[^0-9]/g, '');
    if (raw.length === 10) {
      return { countryCode: '+91', phoneNumber: raw };
    }
    if (raw.length === 12 && raw.startsWith('91')) {
      return { countryCode: '+91', phoneNumber: raw.substring(2) };
    }
    return { countryCode: '+91', phoneNumber: raw };
  }

  /**
   * Track / Register customer contact in Interakt before dispatching message
   */
  async trackUser(toPhone: string, name?: string): Promise<void> {
    if (!this.apiKey) return;
    try {
      const { countryCode, phoneNumber } = this.parsePhone(toPhone);
      await axios.post(
        'https://api.interakt.ai/v1/public/track/users/',
        {
          countryCode,
          phoneNumber,
          traits: { name: name || 'CarBlink Customer' },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${this.apiKey}`,
          },
          timeout: 5000,
        }
      );
    } catch (err) {
      // silent track warning
    }
  }

  /**
   * Send WhatsApp Template Message via Interakt API
   */
  async sendWhatsAppTemplate(
    toPhone: string,
    templateName: string,
    bodyValues: string[] = [],
    headerValues: string[] = []
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const { countryCode, phoneNumber } = this.parsePhone(toPhone);
    await this.trackUser(toPhone);

    if (!this.apiKey) {
      logger.info(`[MOCK WHATSAPP TEMPLATE] To: ${countryCode}${phoneNumber} | Template: ${templateName} | Values: ${bodyValues.join(', ')}`);
      return { success: true, data: { mock: true, message: 'Sent in mock mode' } };
    }

    try {
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

      if (headerValues && headerValues.length > 0) {
        payload.template.headerValues = headerValues;
      }

      const response = await axios.post(
        'https://api.interakt.ai/v1/public/message/',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${this.apiKey}`,
          },
          timeout: 10000,
        }
      );

      logger.info(`[INTERAKT WHATSAPP TEMPLATE SUCCESS] Message sent to ${countryCode}${phoneNumber}`);
      return { success: true, data: response.data };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Interakt API request failed';
      logger.error(`[INTERAKT WHATSAPP ERROR] Failed for ${phoneNumber}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send WhatsApp Direct Text Message / Chatbot Response
   */
  async sendWhatsAppText(
    toPhone: string,
    message: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const { countryCode, phoneNumber } = this.parsePhone(toPhone);
    await this.trackUser(toPhone);

    if (!this.apiKey) {
      logger.info(`[MOCK WHATSAPP TEXT] To: ${countryCode}${phoneNumber} | Msg: ${message}`);
      return { success: true, data: { mock: true } };
    }

    // If default Interakt Template Name is set in env, use Template dispatch for automatic outgoing delivery
    const defaultTemplate = process.env.INTERAKT_TEMPLATE_NAME;
    if (defaultTemplate) {
      return this.sendWhatsAppTemplate(toPhone, defaultTemplate, [message]);
    }

    try {
      const payload = {
        countryCode,
        phoneNumber,
        type: 'Text',
        data: {
          message,
        },
      };

      const response = await axios.post(
        'https://api.interakt.ai/v1/public/message/',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${this.apiKey}`,
          },
          timeout: 10000,
        }
      );

      return { success: true, data: response.data };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message;
      logger.error(`[INTERAKT TEXT ERROR] Failed for ${phoneNumber}:`, errorMessage);

      if (errorMessage.includes('24 hours')) {
        logger.warn('⚠️ Meta 24-hour restriction hit. Create an Approved Template in Interakt Dashboard & set INTERAKT_TEMPLATE_NAME in .env for automatic message delivery without customer initiation.');
      }
      return { success: false, error: errorMessage };
    }
  }
}

export const whatsappProvider = new InteraktWhatsAppProvider();
