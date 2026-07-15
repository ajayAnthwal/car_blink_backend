import { z } from 'zod';

export const placeBidSchema = z.object({
  bookingId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid booking ID format'),
  quotedAmount: z.number().min(0, 'Quoted amount must be 0 or greater'),
  estimatedDuration: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
export default placeBidSchema;
