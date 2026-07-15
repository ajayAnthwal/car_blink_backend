import { z } from 'zod';

export const createBookingSchema = z.object({
  vehicleId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid vehicle ID format'),
  serviceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid service ID format'),
  cityId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid city ID format'),
  description: z.string().trim().optional(),
  preferredDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid preferredDate format',
    })
    .optional(),
});

export const cancelBookingSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').trim(),
});

export const selectQuoteSchema = z.object({
  bidId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid bid ID format'),
});
