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

  async fetchOrder(orderId: string): Promise<any> {
    if (isMockMode || !orderId || orderId.startsWith('mock_')) {
      return null;
    }
    try {
      return await this.client.orders.fetch(orderId);
    } catch (error: any) {
      logger.warn('Razorpay fetchOrder error:', error?.message || error);
      return null;
    }
  }

  async fetchOrderPayments(orderId: string): Promise<any> {
    if (isMockMode || !orderId || orderId.startsWith('mock_')) {
      return null;
    }
    try {
      return await this.client.orders.fetchPayments(orderId);
    } catch (error: any) {
      logger.warn('Razorpay fetchOrderPayments error:', error?.message || error);
      return null;
    }
  }

  async issueRefund(paymentId: string, amount: number, notes?: any): Promise<string> {
    if (isMockMode || !paymentId || paymentId.startsWith('mock_') || paymentId.startsWith('pay_mock_')) {
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

  async createPaymentLink(params: {
    amount: number;
    currency?: string;
    description: string;
    customer?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    notes?: Record<string, any>;
    callbackUrl?: string;
  }): Promise<{ paymentLinkId: string; shortUrl: string; amount: number; currency: string }> {
    const currency = params.currency || 'INR';
    if (isMockMode) {
      const mockId = `plink_mock_${crypto.randomUUID().replace(/-/g, '')}`;
      return {
        paymentLinkId: mockId,
        shortUrl: `https://rzp.io/i/${mockId.slice(-8)}`,
        amount: params.amount,
        currency,
      };
    }

    try {
      const payload: any = {
        amount: Math.round(params.amount * 100),
        currency,
        accept_partial: false,
        description: params.description,
        notes: params.notes || {},
      };

      if (params.customer) {
        payload.customer = {
          name: params.customer.name || 'Valued Customer',
          email: params.customer.email || 'customer@carblink.in',
          contact: params.customer.contact ? String(params.customer.contact).replace(/^\+91/, '').trim() : undefined,
        };
      }

      if (params.callbackUrl) {
        payload.callback_url = params.callbackUrl;
        payload.callback_method = 'get';
      }

      const response = await this.client.paymentLink.create(payload);

      return {
        paymentLinkId: response.id,
        shortUrl: response.short_url,
        amount: params.amount,
        currency,
      };
    } catch (error: any) {
      logger.error('Razorpay createPaymentLink error:', error);
      throw error;
    }
  }

  async fetchPaymentLink(paymentLinkId: string): Promise<any> {
    if (isMockMode || !paymentLinkId || paymentLinkId.startsWith('plink_mock_')) {
      return null;
    }
    try {
      return await this.client.paymentLink.fetch(paymentLinkId);
    } catch (error: any) {
      logger.warn('Razorpay fetchPaymentLink error:', error?.message || error);
      return null;
    }
  }
}

export const razorpayProvider = new RazorpayProvider();
