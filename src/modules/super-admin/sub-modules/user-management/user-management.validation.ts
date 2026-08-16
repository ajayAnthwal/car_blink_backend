import { z } from 'zod';

export const userStatusSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
});
