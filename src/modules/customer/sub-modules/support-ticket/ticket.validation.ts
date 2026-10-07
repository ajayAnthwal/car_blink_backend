import { z } from 'zod';

export const createTicketSchema = z.object({
  bookingId: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim() !== '' && val !== 'none' ? val.trim() : undefined))
    .refine((val) => !val || /^[0-9a-fA-F]{24}$/.test(val), {
      message: 'Invalid booking ID format',
    }),
  category: z.string().optional(),
  subject: z.string().min(1, 'Subject is required').trim(),
  description: z.string().min(1, 'Description is required').trim(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

export const replyTicketSchema = z.object({
  message: z.string().min(1, 'Reply message cannot be empty').trim(),
});
