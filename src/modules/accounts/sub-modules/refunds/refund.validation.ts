import { z } from 'zod';

export const initiateRefundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  amount: z.number().min(0, 'Amount must be positive'),
  reason: z.string().min(1, 'Reason is required'),
});

export const rejectRefundSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
});
