import { z } from 'zod';

export const financeSummaryQuerySchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});
