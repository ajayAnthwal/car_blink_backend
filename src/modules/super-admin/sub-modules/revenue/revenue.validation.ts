import { z } from 'zod';

export const revenueQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'custom', 'all']).default('all'),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export const revenueTrendQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'custom', 'all']).default('all'),
  groupBy: z.enum(['day', 'week', 'month', 'year']).default('day'),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});
