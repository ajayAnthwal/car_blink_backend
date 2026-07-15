import { z } from 'zod';

export const revenueQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'custom']).default('month'),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export const revenueTrendQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'custom']).default('month'),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});
