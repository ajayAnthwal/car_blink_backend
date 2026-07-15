import { z } from 'zod';

export const growthQuerySchema = z.object({
  fromDate: z.string().min(1, 'fromDate is required'),
  toDate: z.string().min(1, 'toDate is required'),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});
