import { env } from '../../../config/env.config';
import { logger } from '../../../config/logger.config';
import crypto from 'crypto';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export interface IPushProvider {
  sendPush(deviceToken: string, title: string, body: string, data?: Record<string, string>): Promise<{ success: boolean; providerMessageId?: string }>;
}

const isMockMode = !env.FIREBASE_PROJECT_ID || !env.FIREBASE_PRIVATE_KEY || !env.FIREBASE_CLIENT_EMAIL;

if (isMockMode) {
  logger.warn('Firebase credentials not configured — running in MOCK PUSH mode');
}

export class PushProvider implements IPushProvider {
  constructor() {
    if (!isMockMode) {
      if (getApps().length === 0) {
        initializeApp({
          credential: cert({
            projectId: env.FIREBASE_PROJECT_ID,
            privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
          }),
        });
      }
    }
  }

  async sendPush(deviceToken: string, title: string, body: string, data?: Record<string, string>): Promise<{ success: boolean; providerMessageId?: string }> {
    if (isMockMode) {
      logger.info(`[MOCK PUSH] token: ${deviceToken} | Title: ${title} | Body: ${body} | Data: ${JSON.stringify(data || {})}`);
      return {
        success: true,
        providerMessageId: `mock_push_${crypto.randomUUID().replace(/-/g, '')}`,
      };
    }

    try {
      const messaging = getMessaging();
      const response = await messaging.send({
        token: deviceToken,
        notification: {
          title,
          body,
        },
        data,
      });
      return {
        success: true,
        providerMessageId: response,
      };
    } catch (error: any) {
      logger.error('Firebase messaging send error:', error);
      return { success: false };
    }
  }
}

export const pushProvider = new PushProvider();
