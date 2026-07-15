import { env } from '../../../config/env.config';
import { logger } from '../../../config/logger.config';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export interface IEmailProvider {
  sendEmail(toEmail: string, subject: string, htmlBody: string): Promise<{ success: boolean; providerMessageId?: string }>;
}

const isMockMode = !env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS;

if (isMockMode) {
  logger.warn('SMTP credentials not configured — running in MOCK EMAIL mode');
}

export class EmailProvider implements IEmailProvider {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (!isMockMode) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST!,
        port: env.SMTP_PORT ? Number(env.SMTP_PORT) : 587,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER!,
          pass: env.SMTP_PASS!,
        },
      });
    }
  }

  async sendEmail(toEmail: string, subject: string, htmlBody: string): Promise<{ success: boolean; providerMessageId?: string }> {
    if (isMockMode) {
      logger.info(`[MOCK EMAIL] to: ${toEmail} | Subject: ${subject} | Body: ${htmlBody}`);
      return {
        success: true,
        providerMessageId: `mock_email_${crypto.randomUUID().replace(/-/g, '')}`,
      };
    }

    try {
      const info = await this.transporter!.sendMail({
        from: env.SMTP_FROM_EMAIL || 'no-reply@carblink.com',
        to: toEmail,
        subject,
        html: htmlBody,
      });
      return {
        success: true,
        providerMessageId: info.messageId,
      };
    } catch (error: any) {
      logger.error('Nodemailer sendEmail error:', error);
      return { success: false };
    }
  }
}

export const emailProvider = new EmailProvider();
