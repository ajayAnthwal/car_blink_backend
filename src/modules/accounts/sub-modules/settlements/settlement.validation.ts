import { z } from 'zod';

export const generateSettlementSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  commissionPercent: z
    .number()
    .min(0, 'Commission percent cannot be negative')
    .max(100, 'Commission percent cannot exceed 100'),
});

export const processSettlementSchema = z.object({
  transactionReference: z.string().min(1, 'Transaction reference is required'),
});
