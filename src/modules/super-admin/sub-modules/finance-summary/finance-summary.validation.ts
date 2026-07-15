import { z } from 'zod';

export const financeSummaryQuerySchema = z.object({
  fromDate: z.string().min(1, 'fromDate is required'),
  toDate: z.string().min(1, 'toDate is required'),
});
