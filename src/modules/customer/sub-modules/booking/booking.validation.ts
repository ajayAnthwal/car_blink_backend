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
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  serviceMode: z.enum(['DOORSTEP', 'GARAGE_VISIT']).optional(),
  paymentMode: z.enum(['CASH', 'ONLINE']).optional(),
  address: z.string().trim().optional(),
  landmark: z.string().trim().optional(),
}).refine(
  (data) => (!!data.address && data.address.trim().length > 0) || (data.latitude !== undefined && data.longitude !== undefined),
  {
    message: 'Location or address is mandatory for booking',
    path: ['address'],
  }
);

export const cancelBookingSchema = z.object({
  reason: z.string().trim().optional(),
  reasons: z.array(z.string()).optional(),
  customerRemarks: z.string().trim().optional(),
});

export const selectQuoteSchema = z.object({
  bidId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid bid ID format'),
});
