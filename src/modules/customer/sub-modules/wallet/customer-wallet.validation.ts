import { z } from 'zod';

export const customerWalletQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
});
