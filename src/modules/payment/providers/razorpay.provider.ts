import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../../../config/env.config';
import { logger } from '../../../config/logger.config';
import { IPaymentProvider } from './provider.interface';

const isMockMode = !env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET;

if (isMockMode) {
  logger.warn('Razorpay keys not configured — running in MOCK payment mode');
}

export class RazorpayProvider implements IPaymentProvider {
  private client: any = null;

  constructor() {
    if (!isMockMode) {
      this.client = new Razorpay({
        key_id: env.RAZORPAY_KEY_ID!,
        key_secret: env.RAZORPAY_KEY_SECRET!,
      });
    }
  }

  async createOrder(amount: number, currency: string, receiptId: string): Promise<{ orderId: string; amount: number; currency: string }> {
    if (isMockMode) {
      const mockOrderId = `mock_order_${crypto.randomUUID().replace(/-/g, '')}`;
      return {
        orderId: mockOrderId,
        amount,
        currency,
      };
    }

    try {
      // Razorpay expects amount in paise (1 INR = 100 paise)
      const order = await this.client.orders.create({
        amount: Math.round(amount * 100),
        currency,
        receipt: receiptId,
      });

      return {
        orderId: order.id,
        amount,
        currency,
      };
    } catch (error: any) {
      logger.error('Razorpay createOrder error:', error);
      throw error;
    }
  }

  async verifyPaymentSignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
    if (isMockMode) {
      return true;
    }

    try {
      const text = orderId + '|' + paymentId;
      const generatedSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET!)
        .update(text)
        .digest('hex');

      return generatedSignature === signature;
    } catch (error: any) {
      logger.error('Razorpay verifyPaymentSignature error:', error);
      return false;
    }
  }

  async fetchPaymentStatus(paymentId: string): Promise<string> {
    if (isMockMode) {
      return 'captured';
    }

    try {
      const payment = await this.client.payments.fetch(paymentId);
      return payment.status;
    } catch (error: any) {
      logger.error('Razorpay fetchPaymentStatus error:', error);
      throw error;
    }
  }

  async issueRefund(paymentId: string, amount: number, notes?: any): Promise<string> {
    if (isMockMode) {
      return `mock_refund_${crypto.randomUUID().replace(/-/g, '')}`;
    }

    try {
      const refund = await this.client.payments.refund(paymentId, {
        amount: Math.round(amount * 100),
        notes,
      });
      return refund.id;
    } catch (error: any) {
      logger.error('Razorpay issueRefund error:', error);
      throw error;
    }
  }
}

export const razorpayProvider = new RazorpayProvider();
