import { z } from 'zod';

export const userStatusSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.string().optional(),
});
