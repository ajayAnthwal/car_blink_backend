import { z } from 'zod';
import { PAYMENT_TYPE } from '../../common/constants/status.constant';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const initiatePaymentSchema = z.object({
  bookingId: z.string().regex(objectIdRegex, 'Invalid bookingId format'),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentType: z.nativeEnum(PAYMENT_TYPE, {
    errorMap: () => ({ message: 'Invalid paymentType' }),
  }),
});

export const verifyPaymentSchema = z.object({
  paymentId: z.string().min(1, 'paymentId is required'),
  orderId: z.string().min(1, 'orderId is required'),
  signature: z.string().min(1, 'signature is required'),
});

export const verifyOfflinePaymentSchema = z.object({
  paymentId: z.string().regex(objectIdRegex, 'Invalid paymentId format'),
});
