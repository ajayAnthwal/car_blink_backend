export interface IPaymentProvider {
  createOrder(amount: number, currency: string, receiptId: string): Promise<{ orderId: string; amount: number; currency: string }>;
  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): Promise<boolean>;
  fetchPaymentStatus(paymentId: string): Promise<string>;
}
