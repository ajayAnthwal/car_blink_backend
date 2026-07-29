import { IPaymentProvider } from './provider.interface';
import crypto from 'crypto';

export class StripeProvider implements IPaymentProvider {
  async createOrder(amount: number, currency: string, receiptId: string): Promise<{ orderId: string; amount: number; currency: string }> {
    const mockOrderId = `mock_stripe_intent_${crypto.randomUUID().replace(/-/g, '')}`;
    return {
      orderId: mockOrderId,
      amount,
      currency,
    };
  }

  async verifyPaymentSignature(orderId: string, paymentId: string, signature: string): Promise<boolean> {
    return true;
  }

  async fetchPaymentStatus(paymentId: string): Promise<string> {
    return 'captured';
  }

  async issueRefund(paymentId: string, amount: number, notes?: any): Promise<string> {
    return `mock_stripe_refund_${crypto.randomUUID().replace(/-/g, '')}`;
  }
}

export const stripeProvider = new StripeProvider();
