import { z } from 'zod';

export const userStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive status is required' }),
});
